import type { ReactNode } from "react";
import { CascaApp } from "@/app/_componentes/casca-app";

export default function LayoutManyChat({ children }: { children: ReactNode }) {
  return <CascaApp>{children}</CascaApp>;
}
