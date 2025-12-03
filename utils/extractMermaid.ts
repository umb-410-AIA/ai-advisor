/// utils/extractMermaid.ts
export const extractMermaidFromText = (text: string) => {
  const match = text.match(/```mermaid\s*([\s\S]*?)```/i);
  if (!match) return { cleanedText: text, mermaid: null };

  const mermaid = match[1].trim();
  const cleanedText = text.replace(match[0], "").trim();

  return { cleanedText: cleanedText || "Here is your course chart:", mermaid };
};