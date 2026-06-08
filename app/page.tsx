import { ProductsScreen } from "@/components/products-screen"
import { BottomNav } from "@/components/bottom-nav"
console.log("Estamos en Page.tsx");

export default function Page() {
  return (
    <>
      <ProductsScreen />
      <BottomNav />
    </>
  )
}
