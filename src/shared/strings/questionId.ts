const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Creates a compact display label without changing the identifier sent to the API. */
export function formatQuestionId(questionId: string) {
  if (!uuidPattern.test(questionId)) return questionId;

  const compact = questionId.replaceAll("-", "");
  return `Q-${compact.slice(-6).toUpperCase()}`;
}
