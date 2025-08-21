import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { User, Mail, Phone } from "lucide-react";
import { Project } from "@/types/project";
import { AssumeResponsibilityDialog } from "./assume-responsibility-dialog";

interface ProjectResponsibleAdminProps {
  project: Project;
  currentUser: {
    uid: string;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    role?: string;
  };
  onUpdate: (updatedProject: Partial<Project>) => Promise<void>;
}

export function ProjectResponsibleAdmin({ project, currentUser, onUpdate }: ProjectResponsibleAdminProps) {
  // Estado para controlar a abertura do diálogo de confirmação
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Verificar se o usuário atual é um admin
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  
  // Verificar se o projeto já tem um admin responsável
  const hasResponsible = !!project.adminResponsibleId;
  
  // Verificar se o usuário atual é o admin responsável
  const isCurrentUserResponsible = project.adminResponsibleId === currentUser?.uid;

  return (
    <div className="mb-4 md:mb-6">
      <h3 className="block text-sm font-medium text-gray-700 mb-2">
        Responsável
      </h3>
      
      {hasResponsible ? (
        <div className="border rounded-md p-3 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              <span className="text-gray-800 dark:text-gray-200">
                {project.adminResponsibleName || "Admin"}
              </span>
            </div>
            
            {project.adminResponsibleEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="text-gray-600 dark:text-gray-300">
                  {project.adminResponsibleEmail}
                </span>
              </div>
            )}
            
            {project.adminResponsiblePhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-500" />
                <span className="text-gray-600 dark:text-gray-300">
                  {project.adminResponsiblePhone}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : isAdmin ? (
        <>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            Assumir Responsabilidade
          </Button>
          
          {/* Diálogo de confirmação */}
          <AssumeResponsibilityDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            project={project}
            currentUser={currentUser}
          />
        </>
      ) : (
        <div className="text-sm text-gray-500 border rounded-md p-3 bg-gray-50 dark:bg-gray-800">
          Nenhum administrador responsável definido.
        </div>
      )}
    </div>
  );
}
