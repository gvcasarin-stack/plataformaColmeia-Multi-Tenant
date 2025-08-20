"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Phone, Building, Save, X, Edit, Key, CreditCard, Briefcase, Bell } from "lucide-react";
import { updateNotificationPreference, updateUserData } from "@/lib/services/userService/supabase";
import { toast } from "@/components/ui/use-toast";
import { getUserDataSupabase, UserData } from "@/lib/services/authService.supabase";
import { Switch } from "@/components/ui/switch";
import { devLog } from "@/lib/utils/productionLogger";
import { LazyPasswordChangeModal } from "@/lib/utils/lazy-components";

export default function ClientProfile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    isCompany: false,
    cpf: '',
    cnpj: '',
    emailNotifications: true,
    whatsappNotifications: false,
    emailNotificacaoStatus: true,
    emailNotificacaoDocumentos: true,
    emailNotificacaoComentarios: true
  });
  
  // Load user data when component mounts
  useEffect(() => {
    async function fetchUserData() {
      if (user?.id) {
        try {
          const data = await getUserDataSupabase(user.id);
          setUserData(data);
          setFormData({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            companyName: data.companyName || '',
            isCompany: data.isCompany || false,
            cpf: data.cpf || '',
            cnpj: data.cnpj || '',
            emailNotifications: data.emailNotifications !== undefined ? data.emailNotifications : true,
            whatsappNotifications: data.whatsappNotifications !== undefined ? data.whatsappNotifications : false,
            emailNotificacaoStatus: data.emailNotificacaoStatus !== undefined ? data.emailNotificacaoStatus : true,
            emailNotificacaoDocumentos: data.emailNotificacaoDocumentos !== undefined ? data.emailNotificacaoDocumentos : true,
            emailNotificacaoComentarios: data.emailNotificacaoComentarios !== undefined ? data.emailNotificacaoComentarios : true
          });
        } catch (error: any) {
          devLog.error("[ClientProfile] Error fetching user data:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados do usuário.",
            variant: "destructive",
          });
        }
      }
    }

    fetchUserData();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleCompanyToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isCompany: checked
    }));
  };

  const handleEmailNotificationsToggle = async (checked: boolean) => {
    if (!userData?.id) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o usuário.",
        variant: "destructive",
      });
      return;
    }

    try {
      setFormData(prev => ({
        ...prev,
        emailNotifications: checked
      }));
      
      await updateNotificationPreference(userData.id, 'emailNotifications', checked);
      
      setUserData({
        ...userData,
        emailNotifications: checked,
        updatedAt: new Date().toISOString()
      });
      
      toast({
        title: "Sucesso",
        description: "Preferência de notificação por email atualizada.",
      });
    } catch (error) {
      devLog.error("[ClientProfile] Error updating email notification preference:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar sua preferência. Tente novamente.",
        variant: "destructive",
      });
      
      setFormData(prev => ({
        ...prev,
        emailNotifications: !checked
      }));
    }
  };

  const handleWhatsAppNotificationsToggle = async (checked: boolean) => {
    if (!userData?.id) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o usuário.",
        variant: "destructive",
      });
      return;
    }

    try {
      setFormData(prev => ({
        ...prev,
        whatsappNotifications: checked
      }));
      
      await updateNotificationPreference(userData.id, 'whatsappNotifications', checked);
      
      setUserData({
        ...userData,
        whatsappNotifications: checked,
        updatedAt: new Date().toISOString()
      });
      
      toast({
        title: "Sucesso",
        description: "Preferência de notificação por WhatsApp atualizada.",
      });
    } catch (error) {
      devLog.error("[ClientProfile] Error updating WhatsApp notification preference:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar sua preferência. Tente novamente.",
        variant: "destructive",
      });
      
      setFormData(prev => ({
        ...prev,
        whatsappNotifications: !checked
      }));
    }
  };

  const handleStatusNotificationsToggle = async (checked: boolean) => {
    if (!userData?.id) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o usuário.",
        variant: "destructive",
      });
      return;
    }

    try {
      setFormData(prev => ({
        ...prev,
        emailNotificacaoStatus: checked
      }));
      
      await updateNotificationPreference(userData.id, 'emailNotificacaoStatus', checked);
      
      setUserData({
        ...userData,
        emailNotificacaoStatus: checked,
        updatedAt: new Date().toISOString()
      });
      
      toast({
        title: "Sucesso",
        description: "Preferência de notificação de status atualizada.",
      });
    } catch (error) {
      devLog.error("[ClientProfile] Error updating status notification preference:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar sua preferência. Tente novamente.",
        variant: "destructive",
      });
      
      setFormData(prev => ({
        ...prev,
        emailNotificacaoStatus: !checked
      }));
    }
  };

  const handleDocumentsNotificationsToggle = async (checked: boolean) => {
    if (!userData?.id) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o usuário.",
        variant: "destructive",
      });
      return;
    }

    try {
      setFormData(prev => ({
        ...prev,
        emailNotificacaoDocumentos: checked
      }));
      
      await updateNotificationPreference(userData.id, 'emailNotificacaoDocumentos', checked);
      
      setUserData({
        ...userData,
        emailNotificacaoDocumentos: checked,
        updatedAt: new Date().toISOString()
      });
      
      toast({
        title: "Sucesso",
        description: "Preferência de notificação para adição de documentos atualizada.",
      });
    } catch (error) {
      devLog.error("Error updating documents notification preference:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar sua preferência. Tente novamente.",
        variant: "destructive",
      });
      
      setFormData(prev => ({
        ...prev,
        emailNotificacaoDocumentos: !checked
      }));
    }
  };

  const handleCommentsNotificationsToggle = async (checked: boolean) => {
    if (!userData?.id) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o usuário.",
        variant: "destructive",
      });
      return;
    }

    try {
      setFormData(prev => ({
        ...prev,
        emailNotificacaoComentarios: checked
      }));
      
      await updateNotificationPreference(userData.id, 'emailNotificacaoComentarios', checked);
      
      setUserData({
        ...userData,
        emailNotificacaoComentarios: checked,
        updatedAt: new Date().toISOString()
      });
      
      toast({
        title: "Sucesso",
        description: "Preferência de notificação para adição de comentários atualizada.",
      });
    } catch (error) {
      devLog.error("Error updating comments notification preference:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar sua preferência. Tente novamente.",
        variant: "destructive",
      });
      
      setFormData(prev => ({
        ...prev,
        emailNotificacaoComentarios: !checked
      }));
    }
  };

  const handleSave = async () => {
    if (!userData?.id) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o usuário.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Verificar se houve alteração no nome da empresa
      const companyNameChanged = userData.companyName !== formData.companyName;
      
      // ✅ SUPABASE - Atualizar dados do usuário usando serviço Supabase
      await updateUserData(userData.id, {
        name: formData.name,
        phone: formData.phone,
        companyName: formData.companyName,
        isCompany: formData.isCompany,
        cpf: formData.cpf,
        cnpj: formData.cnpj,
        emailNotifications: formData.emailNotifications,
        whatsappNotifications: formData.whatsappNotifications,
        emailNotificacaoStatus: formData.emailNotificacaoStatus,
        emailNotificacaoDocumentos: formData.emailNotificacaoDocumentos,
        emailNotificacaoComentarios: formData.emailNotificacaoComentarios,
      });
      
      // ✅ SUPABASE - Atualizar empresa integradora em projetos existentes (se necessário)
      // NOTA: Esta funcionalidade será implementada via server action no futuro
      // Por enquanto, apenas logamos a necessidade de sincronização
      if (companyNameChanged && formData.companyName) {
        devLog.log(`[ClientProfile] Nome da empresa alterado: "${userData.companyName}" -> "${formData.companyName}"`);
        devLog.log(`[ClientProfile] NOTA: Sincronização de projetos será implementada via server action`);
        
        // TODO: Implementar server action para atualizar empresa_integradora em todos os projetos do usuário
        // await updateUserProjectsCompanyAction(userData.id, formData.companyName);
      }
      
      // Update local userData state to reflect changes
      setUserData({
        ...userData,
        name: formData.name,
        phone: formData.phone,
        companyName: formData.companyName,
        isCompany: formData.isCompany,
        cpf: formData.cpf,
        cnpj: formData.cnpj,
        emailNotifications: formData.emailNotifications,
        whatsappNotifications: formData.whatsappNotifications,
        emailNotificacaoStatus: formData.emailNotificacaoStatus,
        emailNotificacaoDocumentos: formData.emailNotificacaoDocumentos,
        emailNotificacaoComentarios: formData.emailNotificacaoComentarios,
        updatedAt: new Date().toISOString()
      });
      
      toast({
        title: "Sucesso",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      
      setIsEditing(false);
    } catch (error) {
      devLog.error("[ClientProfile] Error updating user data:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar suas informações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Perfil</h1>
          <p className="mt-2 text-teal-100">
            Gerencie suas informações pessoais e preferências
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-400/30"></div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-emerald-400/30"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
            <div className="flex justify-center -mt-12">
              <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 p-1 shadow-md">
                <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
            </div>
            <CardContent className="pt-4 text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{formData.name || 'Usuário'}</h3>
              <p className="text-gray-500 dark:text-gray-400">{formData.email}</p>
              
              <div className="mt-6 space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => setIsPasswordModalOpen(true)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Alterar Senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">Informações Pessoais</TabsTrigger>
              <TabsTrigger value="preferences">Preferências</TabsTrigger>
            </TabsList>
            
            <TabsContent value="personal" className="mt-6">
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center">
                        <span className="bg-gradient-to-r from-teal-500 to-emerald-500 h-6 w-1 rounded-full mr-2"></span>
                        Informações Pessoais
                      </CardTitle>
                      <CardDescription>Seus dados cadastrais</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      {!isEditing ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Personal Information Section */}
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center">
                        <User className="h-5 w-5 text-teal-500 mr-2" />
                        Informações Pessoais
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <User className="h-4 w-4 text-teal-500" />
                            Nome
                          </Label>
                          <div className="relative">
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className="pl-10 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <User className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Mail className="h-4 w-4 text-teal-500" />
                            Email
                          </Label>
                          <div className="relative">
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              disabled
                              className="pl-10 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Phone className="h-4 w-4 text-teal-500" />
                            Telefone
                          </Label>
                          <div className="relative">
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="(00) 00000-0000"
                              value={formData.phone}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className="pl-10 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <Phone className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cpf" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <CreditCard className="h-4 w-4 text-teal-500" />
                            CPF
                          </Label>
                          <div className="relative">
                            <Input
                              id="cpf"
                              placeholder="000.000.000-00"
                              value={formData.cpf}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className="pl-10 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <CreditCard className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Commercial Information Section */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium flex items-center">
                          <Building className="h-5 w-5 text-teal-500 mr-2" />
                          Informações Comerciais
                        </h3>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="company-switch" className="text-sm font-medium">
                            Cadastro empresarial
                          </Label>
                          <Switch 
                            id="company-switch"
                            checked={formData.isCompany}
                            onCheckedChange={handleCompanyToggle}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="companyName" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Building className="h-4 w-4 text-teal-500" />
                            Nome da Empresa
                          </Label>
                          <div className="relative">
                            <Input
                              id="companyName"
                              placeholder="Nome da empresa"
                              value={formData.companyName}
                              onChange={handleInputChange}
                              disabled={!isEditing || !formData.isCompany}
                              className={`pl-10 dark:bg-gray-700 dark:border-gray-600 ${!formData.isCompany ? 'opacity-50' : ''}`}
                            />
                            <Building className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cnpj" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Briefcase className="h-4 w-4 text-teal-500" />
                            CNPJ
                          </Label>
                          <div className="relative">
                            <Input
                              id="cnpj"
                              placeholder="00.000.000/0000-00"
                              value={formData.cnpj}
                              onChange={handleInputChange}
                              disabled={!isEditing || !formData.isCompany}
                              className={`pl-10 dark:bg-gray-700 dark:border-gray-600 ${!formData.isCompany ? 'opacity-50' : ''}`}
                            />
                            <Briefcase className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                {isEditing && (
                  <CardFooter className="flex justify-end space-x-4 pt-2 border-t dark:border-gray-700">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-1"
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </Button>
                    <Button 
                      className="flex items-center gap-1"
                      onClick={handleSave}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Salvar Alterações
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="preferences" className="mt-6">
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <div>
                    <CardTitle className="text-xl flex items-center">
                      <span className="bg-gradient-to-r from-teal-500 to-emerald-500 h-6 w-1 rounded-full mr-2"></span>
                      Preferências
                    </CardTitle>
                    <CardDescription>Preferências de Notificações por e-mail</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4 flex items-center">
                      <Bell className="h-5 w-5 text-teal-500 mr-2" />
                      Notificações
                    </h3>
                    <div className="space-y-4">
                      {/* Opções específicas de notificação por email */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-base">Mudança de status dos projetos</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Receba notificações quando o status de seus projetos for alterado
                            </p>
                          </div>
                          <Switch
                            checked={formData.emailNotificacaoStatus}
                            onCheckedChange={handleStatusNotificationsToggle}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-base">Adição de documentos</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Receba notificações quando novos documentos forem adicionados aos seus projetos
                            </p>
                          </div>
                          <Switch
                            checked={formData.emailNotificacaoDocumentos}
                            onCheckedChange={handleDocumentsNotificationsToggle}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-base">Adição de comentários</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Receba notificações quando novos comentários forem adicionados aos seus projetos
                            </p>
                          </div>
                          <Switch
                            checked={formData.emailNotificacaoComentarios}
                            onCheckedChange={handleCommentsNotificationsToggle}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Password Change Modal */}
      <LazyPasswordChangeModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
} 