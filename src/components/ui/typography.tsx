import * as React from "react"
import type { JSX } from "react"
import { cn } from "../../lib/utils"

type ElementProps<T extends keyof JSX.IntrinsicElements> = React.HTMLAttributes<HTMLElement> & JSX.IntrinsicElements[T]

export function H1({ className, ...props }: ElementProps<'h1'>) {
  return <h1 className={cn("type-h1", className)} {...props} />
}

export function H2({ className, ...props }: ElementProps<'h2'>) {
  return <h2 className={cn("type-h2", className)} {...props} />
}

export function H3({ className, ...props }: ElementProps<'h3'>) {
  return <h3 className={cn("type-h3", className)} {...props} />
}

export function H4({ className, ...props }: ElementProps<'h4'>) {
  return <h4 className={cn("type-h4", className)} {...props} />
}

export function H5({ className, ...props }: ElementProps<'h5'>) {
  return <h5 className={cn("type-h5", className)} {...props} />
}

export function H6({ className, ...props }: ElementProps<'h6'>) {
  return <h6 className={cn("type-h6", className)} {...props} />
}

export function P({ className, ...props }: ElementProps<'p'>) {
  return <p className={cn("type-p", className)} {...props} />
}

export function Lead({ className, ...props }: ElementProps<'p'>) {
  return <p className={cn("type-lead", className)} {...props} />
}

export function Muted({ className, ...props }: ElementProps<'p'>) {
  return <p className={cn("type-muted", className)} {...props} />
}

export function Small({ className, ...props }: ElementProps<'small'>) {
  return <small className={cn("type-small", className)} {...props} />
}


