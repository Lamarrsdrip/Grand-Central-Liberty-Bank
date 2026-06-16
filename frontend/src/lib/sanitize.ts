const allowedTags = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "em",
  "h1",
  "h2",
  "h3",
  "li",
  "ol",
  "p",
  "strong",
  "u",
  "ul"
]);

const allowedAttributes = new Set(["href", "target", "rel"]);

export function sanitizeHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+=(["']).*?\1/gi, "")
    .replace(/\s(href|src)=(["'])\s*javascript:[\s\S]*?\2/gi, "")
    .replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, tagName, rawAttributes) => {
      const tag = String(tagName).toLowerCase();
      if (!allowedTags.has(tag)) {
        return "";
      }

      if (match.startsWith("</")) {
        return `</${tag}>`;
      }

      const attributes = String(rawAttributes)
        .match(/\s[a-zA-Z-]+=(["']).*?\1/g)
        ?.map((attribute) => {
          const name = attribute.trim().split("=")[0]?.toLowerCase();
          if (!name || !allowedAttributes.has(name)) {
            return "";
          }
          if (name === "href" && /javascript:/i.test(attribute)) {
            return "";
          }
          return attribute;
        })
        .join("") ?? "";

      const safeAttributes =
        tag === "a" && !/rel=/.test(attributes) ? `${attributes} rel="noopener noreferrer"` : attributes;

      return `<${tag}${safeAttributes}>`;
    });
}

export function plainText(input: string, maxLength = 5000) {
  return input.replace(/[<>]/g, "").trim().slice(0, maxLength);
}
