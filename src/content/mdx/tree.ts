/**
 * The compiled-body format, re-exported for the render layer.
 *
 * The canonical definition lives in `content/mdx/tree.ts`, because the format is
 * what the BUILD produces — it is a property of the content, not of the
 * application. `content/` may not import from `src/`, so the definition has to
 * live on that side of the boundary; and `src/` MAY import from `content/` (only
 * `src/features/` and `src/components/` are barred, by the ESLint rule), so this
 * one-line re-export is how the registry and the React renderer get the types
 * without a second, divergent copy.
 *
 * Import `CompiledBody` from here inside `src/`. Do not redefine it.
 */
export {
  ALLOWED_ELEMENTS,
  isSafeUrl,
  type AllowedElement,
  type CompiledBody,
  type CompiledNode,
  type ComponentNode,
  type ElementNode,
  type ElementProp,
  type TextNode,
} from '@content/mdx/tree.ts'
