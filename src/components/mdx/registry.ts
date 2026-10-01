import type { ComponentType } from 'react'
import type { CompiledNode, ElementProp } from '@/app/mdx.ts'

/**
 * THE MDX COMPONENT REGISTRY (M2.2, moved to `src/components/` at M2.3).
 *
 * The one place content can become code. It is deliberately a plain object,
 * enumerated by hand, and it is the SECOND half of the trust boundary described
 * in `DECISIONS.md` D22: the compiler refuses to EMIT an unknown component, and
 * this registry refuses to RENDER one.
 *
 * Two lists rather than one is not redundancy. It means a component can be
 * authored into content before the renderer knows it — the failure is then
 * "unknown component Callout" at the point the lesson renders, which is a clear,
 * local error — instead of "the build will not run", which would make adding a
 * component and adding content a single coupled change.
 *
 * WHY AN OBJECT AND NOT A MODULE MAP
 *
 * A `Record<string, ComponentType>` cannot be populated from content, because the
 * compiler emits a NAME, never an import. There is no `import()` keyed by a
 * content string anywhere in this project, and that is the point: a string in a
 * lesson must never be able to reach an arbitrary module.
 *
 * ADDING A COMPONENT
 *
 * 1. Write the component (a `src/components/mdx/` file, or a feature component).
 * 2. Add one entry here.
 * 3. Use it in content as `<Name prop="literal">…</Name>`.
 *
 * Props arriving here are literals only — a string, number or boolean — because
 * the compiler rejects expression props. So a component must never require a
 * function prop; if it does, it cannot be a curriculum component.
 */

/** A component that may appear in lesson content. Keeps props to literals. */
export type CurriculumComponent = ComponentType<{
  readonly [prop: string]: ElementProp | readonly CompiledNode[] | undefined
}>

/**
 * The allowlist. Empty of custom components at M2.2 by design: no current
 * content uses one, and the first addition should be a visible, reviewed act
 * rather than a speculative handful of components nobody has authored against.
 *
 * The ordinary Markdown elements are NOT here — they are HTML rendered directly
 * by the renderer, and listing them would imply content could redefine `<p>`.
 */
export const curriculumComponents: Readonly<Record<string, CurriculumComponent>> = {}

/** True when a component name can be rendered. */
export const isKnownComponent = (name: string): boolean =>
  Object.prototype.hasOwnProperty.call(curriculumComponents, name)
