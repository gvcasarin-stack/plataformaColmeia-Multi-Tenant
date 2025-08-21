import { Project, UpdatedProject, TimelineEvent } from "@/types/project";
import { v4 as uuidv4 } from 'uuid';

export interface FileUploadSectionProps {
  project: Project;
  onUpdate: (updatedProject: UpdatedProject) => Promise<void>;
}

const createTimelineEvent = (file: File, url: string, timestamp: string, userId: string, userEmail: string, userName?: string): TimelineEvent => ({
  type: 'document' as const,
  user: userName || userEmail,
  userId: userId,
  timestamp: timestamp,
  fileName: file.name,
  fileUrl: url,
  content: 'Documento anexado',
  id: uuidv4()
});
