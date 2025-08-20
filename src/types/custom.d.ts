/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Este arquivo pode ser editado para adicionar tipos personalizados
// ao contrário do next-env.d.ts que não deve ser modificado

// Type declarations for modules without type definitions

declare module 'debug' {
  const debug: any;
  export default debug;
}

declare module 'diff-match-patch' {
  const diffMatchPatch: any;
  export default diffMatchPatch;
}

declare module 'estree-jsx' {
  const estreeJsx: any;
  export default estreeJsx;
}

declare module 'mdast' {
  const mdast: any;
  export default mdast;
}

declare module 'ms' {
  const ms: any;
  export default ms;
}

// Fix for the Button component
import { ButtonHTMLAttributes } from 'react';

declare module './ui/button' {
  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    asChild?: boolean;
  }
} 