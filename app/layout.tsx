import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"ParabelluM • Controle da CP", description:"Controle público de Adena, equipamentos, drops e cristais da CP ParabelluM.", icons:{icon:"/favicon.svg"} };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
