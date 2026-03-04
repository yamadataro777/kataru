import type {
  Stage1LogicalData,
  Stage1EmotionalData,
  Stage2Data,
  Stage3Data,
  Stage4Data,
  RunningContext,
  IssueFrame,
  ReviewAxisType,
} from '../types/conversation';

export interface ValidationResult {
  complete: boolean;              // = strictComplete（Stage 2-4 後方互換）
  strictComplete: boolean;
  goodEnoughForStage2: boolean;   // Stage 1 のみ意味がある
  reasons: string[];              // strict 不足項目
  softReasons: string[];          // good-enough 不足項目
}

// ============================================================
// Placeholder / Generic Data Detection
// ============================================================

// 最低文字数（日本語で意味のある文は5文字以上）
const MIN_MEANINGFUL_LENGTH = 5;

// LLM が雑に埋めがちな placeholder パターン
const PLACEHOLDER_PATTERNS = [
  /^具体的な/,
  /^詳しい/,
  /^何らかの/,
  /^ある程度の/,
  /^状況について/,
  /^不明$/,
  /^未定$/,
  /^要確認$/,
];

/**
 * 文字列が「有効に埋まっている」かどうかを判定する。
 * null/空白/短すぎ/placeholder パターン → false
 */
function isFilledMeaningfully(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < MIN_MEANINGFUL_LENGTH) return false;
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }
  return true;
}

/**
 * partial 以上か（filled or partial 相当 — 短くても何か書いてある）
 */
function isAtLeastPartial(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.trim().length >= 2;
}

// ============================================================
// Section 1 Logical の完了条件（Dual Track）
// ============================================================
export function checkSection1Logical(
  data: Stage1LogicalData,
  rc: Pick<RunningContext, 'ambiguous_terms' | 'issues_prioritized' | 'all_issues'> & { issue_frame?: IssueFrame | null }
): ValidationResult {
  // --- Strict Track（既存相当）---
  const strictReasons: string[] = [];

  if (!isFilledMeaningfully(data.central_problem)) {
    strictReasons.push('中心となる問題が明確でない');
  }
  if (!isFilledMeaningfully(data.current_situation)) {
    strictReasons.push('現状認識が不明確');
  }
  if (data.key_factors.length < 1) {
    strictReasons.push('主要な論点が挙がっていない');
  }
  if (!isFilledMeaningfully(data.decision_needed)) {
    strictReasons.push('何を決める必要があるかが不明');
  }

  // 未解決の曖昧語がある場合
  const unresolvedTerms = (rc.ambiguous_terms ?? []).filter((t) => !t.resolved);
  if (unresolvedTerms.length > 0) {
    strictReasons.push(`未定義の曖昧語がある: ${unresolvedTerms.map((t) => t.term).join(', ')}`);
  }

  // 複数論点がある場合、優先論点が選択されていること
  const issues = rc.all_issues ?? [];
  const activeIssues = issues.filter((i) => i.active);
  if (issues.length >= 2 && activeIssues.length === 0 && !(rc.issues_prioritized)) {
    strictReasons.push('複数の論点がある場合、どれを今日話すか選んでいない');
  }

  const strictComplete = strictReasons.length === 0;

  // --- Good-enough Track（新設）---
  const softReasons: string[] = [];

  // central_problem filled（必須）
  if (!isFilledMeaningfully(data.central_problem)) {
    softReasons.push('中心となる問題が明確でない');
  }

  // current_situation partial 以上でOK（緩和）
  if (!isAtLeastPartial(data.current_situation)) {
    softReasons.push('現状認識が少なくとも部分的に必要');
  }

  // key_factors ≥ 1 OR constraints ≥ 1（緩和）
  if (data.key_factors.length < 1 && data.constraints.length < 1) {
    softReasons.push('主要な論点または制約が1つ以上必要');
  }

  // decision_needed: decision_conflict / priority_conflict のみ必須
  const issueFrame = rc.issue_frame ?? null;
  if (issueFrame === 'decision_conflict' || issueFrame === 'priority_conflict') {
    if (!isFilledMeaningfully(data.decision_needed)) {
      softReasons.push('何を決める必要があるかが不明');
    }
  }

  // 未解決曖昧語: ブロッカーにしない（削除）

  // 複数論点時に active 選択済み（維持）
  if (issues.length >= 2 && activeIssues.length === 0 && !(rc.issues_prioritized)) {
    softReasons.push('複数の論点がある場合、どれを今日話すか選んでいない');
  }

  const goodEnoughForStage2 = softReasons.length === 0;

  return {
    complete: strictComplete,
    strictComplete,
    goodEnoughForStage2,
    reasons: strictReasons,
    softReasons,
  };
}

// ============================================================
// Section 1 Emotional の完了条件（Dual Track）
// ============================================================
export function checkSection1Emotional(
  data: Stage1EmotionalData,
  _rc: Pick<RunningContext, 'ambiguous_terms'>
): ValidationResult {
  // --- Strict Track（既存相当）---
  const strictReasons: string[] = [];

  const hasNonVagueEmotions = data.primary_emotions.length >= 1 && !data.primary_emotions.every(
    (e) => e.length < 3 || /^(なんとなく|よくわからない|モヤモヤ|微妙)$/i.test(e.trim())
  );

  if (data.primary_emotions.length < 1) {
    strictReasons.push('主要な感情が特定できていない');
  } else if (!hasNonVagueEmotions) {
    strictReasons.push('感情がまだ曖昧（もう少し具体的なラベルが必要）');
  }
  if (data.emotional_triggers.length < 1) {
    strictReasons.push('感情のきっかけが不明確');
  }
  if (data.inner_conflicts.length < 1 && data.unmet_needs.length < 1) {
    strictReasons.push('内的な引っかかりがまだ言語化されていない');
  }
  if (!isFilledMeaningfully(data.desired_emotional_state)) {
    strictReasons.push('どんな状態になりたいかが不明確');
  }

  const strictComplete = strictReasons.length === 0;

  // --- Good-enough Track（新設）---
  const softReasons: string[] = [];

  // primary_emotions ≥ 1 かつ非 vague（必須）
  if (!hasNonVagueEmotions) {
    if (data.primary_emotions.length < 1) {
      softReasons.push('主要な感情が特定できていない');
    } else {
      softReasons.push('感情がまだ曖昧（もう少し具体的なラベルが必要）');
    }
  }

  // emotional_triggers ≥ 1 OR inner_conflicts ≥ 1 OR unmet_needs ≥ 1（いずれか1つで可）
  if (data.emotional_triggers.length < 1 && data.inner_conflicts.length < 1 && data.unmet_needs.length < 1) {
    softReasons.push('感情のきっかけ・内的葛藤・満たされないニーズのいずれか1つが必要');
  }

  // desired_emotional_state: 不要（削除）

  const goodEnoughForStage2 = softReasons.length === 0;

  return {
    complete: strictComplete,
    strictComplete,
    goodEnoughForStage2,
    reasons: strictReasons,
    softReasons,
  };
}

// ============================================================
// Section 2 の完了条件（後方互換）
// ============================================================
export function checkSection2(
  data: Stage2Data,
  rc: Pick<RunningContext, 'ambiguous_terms' | 'goal_hierarchy'>
): ValidationResult {
  const reasons: string[] = [];

  if (!data.goal_type) {
    reasons.push('目標の種類（定量/定性）が未確定');
  }
  if (!isFilledMeaningfully(data.goal_statement)) {
    reasons.push('目標が言語化されていない');
  }

  // 上位目標（ultimate）が確認されていること
  const goalHierarchy = rc.goal_hierarchy;
  if (!goalHierarchy?.ultimate) {
    reasons.push('この目標の先にある上位目標（本当にしたいこと）が確認されていない');
  }

  // 未解決の曖昧語がある場合
  const unresolvedTerms = (rc.ambiguous_terms ?? []).filter((t) => !t.resolved);
  if (unresolvedTerms.length > 0) {
    reasons.push(`未定義の曖昧語がある: ${unresolvedTerms.map((t) => t.term).join(', ')}`);
  }

  if (data.goal_type === 'quantitative' && !data.metric && !data.deadline) {
    reasons.push('達成指標または期限が必要');
  }
  if (data.goal_type === 'qualitative' && data.observable_signs.length < 1) {
    reasons.push('達成を観察できる変化が明確でない');
  }
  if (data.goal_type === 'qualitative' && !data.why_this_goal_matters) {
    reasons.push('この目標の意味・理由が不明確');
  }

  const complete = reasons.length === 0;
  return { complete, strictComplete: complete, goodEnoughForStage2: false, reasons, softReasons: [] };
}

// ============================================================
// Section 3 の完了条件（後方互換）
// ============================================================
export function checkSection3(data: Stage3Data): ValidationResult {
  const reasons: string[] = [];

  if (data.action_candidates.length < 1) {
    reasons.push('行動候補が出ていない');
  }
  if (!isFilledMeaningfully(data.selected_action)) {
    reasons.push('実行する行動が決まっていない');
  }
  if (!isFilledMeaningfully(data.first_step)) {
    reasons.push('最初のアクションが不明確');
  }
  if (!data.obstacles_acknowledged) {
    reasons.push('障害の有無を確認していない');
  }

  const complete = reasons.length === 0;
  return { complete, strictComplete: complete, goodEnoughForStage2: false, reasons, softReasons: [] };
}

// ============================================================
// Section 4 の完了条件（Adaptive Branching 対応）
// ============================================================
const VALID_REVIEW_AXIS_TYPES: ReadonlySet<string> = new Set<ReviewAxisType>([
  'execution_check', 'goal_approach', 'obstacle_recurrence',
]);

export function checkSection4(data: Stage4Data): ValidationResult {
  // Recovery regression: should_return_to_stage3 → stage3_resize_hint があれば complete
  if (data.should_return_to_stage3) {
    const reasons: string[] = [];
    if (!data.stage3_resize_hint?.trim()) {
      reasons.push('Stage 3 への再設計ヒントが必要');
    }
    const complete = reasons.length === 0;
    return { complete, strictComplete: complete, goodEnoughForStage2: false, reasons, softReasons: [] };
  }

  // soft_complete パス: efficacy 閾値不要、ただし requires_priority_followup 必須
  if (data.soft_complete === true) {
    const reasons: string[] = [];
    if (!data.requires_priority_followup) {
      reasons.push('soft_complete 時は requires_priority_followup が必須');
    }
    if (!isFilledMeaningfully(data.commitment_statement)) {
      reasons.push('コミットメント宣言が未完了');
    }
    if (!isFilledMeaningfully(data.next_check_in_point)) {
      reasons.push('次の振り返りタイミングが未設定');
    }
    if (!data.review_axes || data.review_axes.length < 2) {
      reasons.push('振り返り軸が2つ以上必要');
    }
    const complete = reasons.length === 0;
    return { complete, strictComplete: complete, goodEnoughForStage2: false, reasons, softReasons: [] };
  }

  const reasons: string[] = [];

  // 初期・最終 efficacy の必須チェック
  if (data.self_efficacy_level_initial == null) {
    reasons.push('初期自己効力感が未測定');
  }
  if (data.self_efficacy_level_final == null) {
    reasons.push('最終自己効力感が未測定');
  }

  // delta < 0 で原因未記録
  if (data.self_efficacy_delta != null && data.self_efficacy_delta < 0 && !data.negative_delta_cause) {
    reasons.push('自己効力感低下の原因が未記録');
  }

  if (!isFilledMeaningfully(data.commitment_statement)) {
    reasons.push('コミットメント宣言が未完了');
  }

  // efficacy 閾値: recovery_subpath で分岐
  let efficacyThreshold: number;
  if (data.recovery_subpath === 'light_commit') {
    efficacyThreshold = 4;
  } else if (data.stage4_path === 'recovery') {
    efficacyThreshold = 4;
  } else {
    efficacyThreshold = 6;
  }
  const finalEfficacy = data.self_efficacy_level_final ?? data.self_efficacy_level;
  if (!finalEfficacy || finalEfficacy < efficacyThreshold) {
    reasons.push(`自己効力感がまだ低い（${efficacyThreshold}以上が必要）`);
  }

  if (!isFilledMeaningfully(data.next_check_in_point)) {
    reasons.push('次の振り返りタイミングが未設定');
  }

  if (!data.review_axes || data.review_axes.length < 2) {
    reasons.push('振り返り軸が2つ以上必要');
  }

  // review_axis_types 検証: 有効な type のみ許容
  if (data.review_axis_types && data.review_axis_types.length > 0) {
    const invalid = data.review_axis_types.filter(t => !VALID_REVIEW_AXIS_TYPES.has(t));
    if (invalid.length > 0) {
      reasons.push(`無効な review_axis_type: ${invalid.join(', ')}`);
    }
  }

  // safety_shortened: identity_prompt_type が null でも OK
  // (no additional validation needed — identity_prompt_type is not required when stage4_shortened_for_safety)

  // G4: negative_delta セーフティネット — delta < 0 のまま soft_complete 未設定
  // Note: soft_complete === true は上の早期リターンで処理済み。
  // ここに到達 = soft_complete は false。delta < 0 なら soft_complete が必要。
  if (
    data.negative_delta_occurred === true &&
    data.self_efficacy_delta != null &&
    data.self_efficacy_delta < 0
  ) {
    reasons.push('negative_delta が未回復のまま soft_complete が設定されていない');
  }

  // G5: recovery_light_commit 時の short check-in 検証
  if (data.recovery_subpath === 'light_commit' && data.next_check_in_point) {
    const hasShortCheckIn = /(?:24|48|72|明日|明後日|\dh)/.test(data.next_check_in_point);
    if (!hasShortCheckIn) {
      reasons.push('recovery_light_commit 時は 24-72h の短い check-in が必要');
    }
  }

  const complete = reasons.length === 0;
  return { complete, strictComplete: complete, goodEnoughForStage2: false, reasons, softReasons: [] };
}
