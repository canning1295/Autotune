import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export interface ProjectData {
  id?: number;
  name: string;
  createdAt?: string;
  // etc...
}

export async function fetchProjects(): Promise<ProjectData[]> {
  const response = await axios.get<ProjectData[]>(`${API_BASE_URL}/projects`);
  return response.data;
}

export async function createProject(projectData: ProjectData): Promise<ProjectData> {
  const response = await axios.post<ProjectData>(`${API_BASE_URL}/projects`, projectData);
  return response.data;
}

// Add other endpoints as needed...