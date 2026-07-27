import { getSupabase } from '@/lib/supabase';

export interface AssistantReply {
  answer: string;
  /** True when the answer came from the language model rather than local rules. */
  fromModel: boolean;
}

/**
 * Sends the question and a compact data context to the `ai-assistant` Edge
 * Function. The function holds the model API key server-side — the browser
 * never sees it.
 */
export async function askAssistant(
  question: string,
  context: unknown,
  history: { role: 'user' | 'assistant'; content: string }[] = [],
): Promise<AssistantReply> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured, so the assistant cannot run.');
  }

  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { question, context, history: history.slice(-6) },
  });

  if (error) {
    throw new Error(
      error.message.includes('Function not found')
        ? 'The AI assistant function is not deployed yet. Deploy supabase/functions/ai-assistant to enable free-form questions.'
        : error.message,
    );
  }

  const answer = (data as { answer?: string } | null)?.answer;
  if (!answer) throw new Error('The assistant returned an empty response.');

  return { answer, fromModel: true };
}
