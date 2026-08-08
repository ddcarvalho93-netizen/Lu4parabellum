import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";
export const metadata: Metadata = {
  metadataBase:new URL("https://parabellum-lu4.ddcarvalho93.chatgpt.site"),
  title:"ParabelluM • Controle da CP",
  description:"Controle público de Adena, equipamentos, drops e cristais da CP ParabelluM.",
  icons:{icon:"/parabellum-emblem.png"},
  openGraph:{title:"ParabelluM • Controle da CP",description:"Três Tyrants, um Tank Dark Elf e uma Gladiadora unidos pela progressão da CP.",images:[{url:"/og.png",width:1792,height:1024,alt:"Formação principal ParabelluM"}]},
  twitter:{card:"summary_large_image",title:"ParabelluM • Controle da CP",description:"Progressão transparente da CP no Lineage 2 LU4.",images:["/og.png"]},
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
