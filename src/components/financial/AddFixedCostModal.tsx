'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { PlusCircle } from 'lucide-react';

interface AddFixedCostModalProps {
  onCostAdded: () => void;
}

export default function AddFixedCostModal({ onCostAdded }: AddFixedCostModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    category: '',
    startMonth: '',
    endMonth: ''
  });
  
  const categories = [
    'Escritório',
    'Tecnologia',
    'Comunicação',
    'Serviços',
    'Seguros',
    'Impostos',
    'Licenças',
    'Outros'
  ];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para criar um custo fixo.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Converter inputs de mês (YYYY-MM) para data no primeiro dia do mês (YYYY-MM-01)
      const toMonthDate = (m?: string) => {
        if (!m) return undefined as unknown as string;
        // Garantir formato válido
        const [y, mo] = m.split('-');
        if (!y || !mo) return undefined as unknown as string;
        return `${y}-${mo}-01`;
      };

      const response = await fetch('/api/financial/fixed-costs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: formData.category,
          name: formData.name,
          description: formData.description,
          amount: formData.amount,
          user_id: user.id,
          vigencia_inicio: toMonthDate(formData.startMonth),
          vigencia_fim: toMonthDate(formData.endMonth)
        }),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao criar custo fixo');
      }
      
      toast({
        title: 'Custo fixo adicionado',
        description: 'O custo fixo foi criado com sucesso.',
        variant: 'default',
      });
      
      setFormData({
        name: '',
        description: '',
        amount: '',
        category: '',
        startMonth: '',
        endMonth: ''
      });
      
      setOpen(false);
      onCostAdded();
      
    } catch (error) {
      console.error('Erro ao criar custo fixo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o custo fixo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Adicionar Custo Fixo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Custo Fixo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Aluguel do escritório"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição adicional do custo"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Valor Mensal (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0,00"
              required
            />
          </div>

          {/* Vigência */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startMonth">Início (mês/ano)</Label>
              <Input
                id="startMonth"
                type="month"
                value={formData.startMonth}
                onChange={(e) => setFormData({ ...formData, startMonth: e.target.value })}
                placeholder="YYYY-MM"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endMonth">Término (mês/ano)</Label>
              <Input
                id="endMonth"
                type="month"
                value={formData.endMonth}
                onChange={(e) => setFormData({ ...formData, endMonth: e.target.value })}
                placeholder="YYYY-MM"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 