/**
 * Global type declaration for SVG files imported as React components.
 *
 * With @svgr/webpack configured in next.config.js, any `import Foo from './foo.svg'`
 * resolves to a React functional component that accepts standard SVG props.
 * This declaration ensures TypeScript recognises that shape.
 */
declare module '*.svg' {
  import type { FC, SVGProps } from 'react'
  const ReactComponent: FC<SVGProps<SVGSVGElement>>
  export default ReactComponent
}
