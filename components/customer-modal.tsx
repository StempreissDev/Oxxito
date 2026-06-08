"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type CustomerModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: { name: string; phone: string }) => void
}

export function CustomerModal({ open, onOpenChange, onSave }: CustomerModalProps) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  useEffect(() => {
    if (open) {
      setName("")
      setPhone("")
    }
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), phone: phone.trim() })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Agregar Cliente</DialogTitle>
          <DialogDescription>
            Registra un nuevo cliente para tu cartera.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
          <div className="flex flex-col gap-2">
            <label htmlFor="cname" className="text-sm font-medium text-foreground">
              Nombre completo
            </label>
            <Input
              id="cname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. María Fernanda López"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="cphone" className="text-sm font-medium text-foreground">
              Teléfono
            </label>
            <Input
              id="cphone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="55 1234 5678"
            />
          </div>

          <DialogFooter className="flex-row justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
