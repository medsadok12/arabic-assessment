// Match the Letter Catcher comparison in verified-training.js. This predicts
// feedback only; the server still confirms scores, rewards and saved results.
const canonicalLetter = value => String(value).normalize('NFC').replace(/[ً-ْٰـ]/g, '');
export const letterCatcherAnswerMatches = (value, expected) => canonicalLetter(value) === canonicalLetter(expected);

export function createLetterCatcherAnswerFeedback() {
  let active = null;
  return {
    isPending: () => active !== null,
    invalidate: () => { active = null; },
    begin({ word, index, option, tried = [] }, handlers) {
      if (active) return false;
      const attempt = {
        wordId: String(word.id), index, option, priorTried: [...tried],
        localRight: letterCatcherAnswerMatches(option, word.missing_letter),
      };
      const token = { attempt };
      active = token;
      const settle = response => {
        if (response == null || active !== token) return;
        active = null;
        handlers.onConfirmed(response, attempt);
      };
      handlers.onPreview(attempt);
      try {
        const submitted = handlers.submit(index, option, settle);
        // Completion of the request is not confirmation: the verified hook may
        // return null and retain this callback for a later idempotent retry.
        submitted?.catch?.(() => {});
      } catch {
        // Keep the visible attempt locked until retry confirms or we invalidate.
      }
      return true;
    },
  };
}
