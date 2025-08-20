"use client"

import { useCallback, useRef } from "react"
import { Button } from "./button"
import { devLog } from "@/lib/utils/productionLogger";
import { Upload } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void | Promise<void>
  maxFiles?: number
  maxSize?: number
  selectedFiles?: File[]
  loading?: boolean
  accept?: string
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB default - alinhado com FileUploadSection
  selectedFiles = [],
  loading = false,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png"
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || [])
      
      // ✅ VALIDAÇÃO 1: Verificar quantidade de arquivos
      if (files.length > maxFiles) {
        toast({
          title: "Muitos arquivos selecionados",
          description: `Você selecionou ${files.length} arquivos. O máximo permitido é ${maxFiles} arquivos por vez.`,
          variant: "destructive"
        })
        return
      }
      
      // ✅ VALIDAÇÃO 2: Verificar tamanho dos arquivos
      const oversizedFiles = files.filter(file => file.size > maxSize)
      if (oversizedFiles.length > 0) {
        const oversizedList = oversizedFiles.map(file => 
          `• ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`
        ).join('\n')
        
        toast({
          title: `${oversizedFiles.length === 1 ? 'Arquivo muito grande' : 'Arquivos muito grandes'}`,
          description: `${oversizedFiles.length === 1 ? 'O arquivo excede' : 'Os arquivos excedem'} o limite de ${Math.round(maxSize / 1024 / 1024)}MB:\n${oversizedList}`,
          variant: "destructive"
        })
        return
      }
      
      // ✅ Todos os arquivos são válidos
      await onFilesSelected(files)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [maxFiles, maxSize, onFilesSelected, toast]
  )

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()

      const files = Array.from(event.dataTransfer.files)
      
      // ✅ VALIDAÇÃO 1: Verificar quantidade de arquivos
      if (files.length > maxFiles) {
        toast({
          title: "Muitos arquivos arrastados",
          description: `Você arrastou ${files.length} arquivos. O máximo permitido é ${maxFiles} arquivos por vez.`,
          variant: "destructive"
        })
        return
      }
      
      // ✅ VALIDAÇÃO 2: Verificar tamanho dos arquivos
      const oversizedFiles = files.filter(file => file.size > maxSize)
      if (oversizedFiles.length > 0) {
        const oversizedList = oversizedFiles.map(file => 
          `• ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`
        ).join('\n')
        
        toast({
          title: `${oversizedFiles.length === 1 ? 'Arquivo muito grande' : 'Arquivos muito grandes'}`,
          description: `${oversizedFiles.length === 1 ? 'O arquivo excede' : 'Os arquivos excedem'} o limite de ${Math.round(maxSize / 1024 / 1024)}MB:\n${oversizedList}`,
          variant: "destructive"
        })
        return
      }
      
      // ✅ Todos os arquivos são válidos
      await onFilesSelected(files)
    },
    [maxFiles, maxSize, onFilesSelected, toast]
  )

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  return (
    <div
      className="w-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {loading ? "Enviando..." : "Selecionar arquivos"}
        </Button>
        <p className="mt-2 text-sm text-gray-500">
          ou arraste e solte aqui
        </p>
        <p className="mt-1 text-xs text-gray-500">
          PDF, Word ou imagens até {Math.round(maxSize / 1024 / 1024)}MB (máximo {maxFiles} arquivos por vez)
        </p>
      </div>
    </div>
  )
} 