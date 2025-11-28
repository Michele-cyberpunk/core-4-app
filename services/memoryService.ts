import { PersonaSessionData, AffectiveMemory } from '../types';

class MemoryService {
  public saveSession(sessionData: PersonaSessionData): void {
    try {
      const dataToSave: PersonaSessionData = {
        ...sessionData,
        saveTimestamp: Date.now()
      };
      const jsonString = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `persona_session_v3_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to save session data:", error);
      alert("Error: Could not save session data to file.");
    }
  }

  public loadSession(file: File): Promise<PersonaSessionData> {
    return new Promise((resolve, reject) => {
      if (!file || file.type !== 'application/json') {
        return reject(new Error("Invalid file type. Please select a .json session file."));
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const result = event.target?.result;
          if (typeof result === 'string') {
            const data: Partial<PersonaSessionData> & { memories?: AffectiveMemory[] } = JSON.parse(result);
            // Basic validation to ensure it's a valid session file
            if (data.coreState && data.insights && (data.affectiveMemory || data.memories)) {
              if (data.memories && !data.affectiveMemory) {
                data.affectiveMemory = data.memories;
                delete data.memories;
              }
              resolve(data as PersonaSessionData);
            } else {
              reject(new Error("File does not appear to be a valid Persona session file."));
            }
          } else {
            reject(new Error("Failed to read file content."));
          }
        } catch (error) {
          console.error("Error parsing session file:", error);
          reject(new Error("Could not parse session file. It may be corrupt."));
        }
      };
      reader.onerror = () => {
        reject(new Error("Failed to read the file."));
      };
      reader.readAsText(file);
    });
  }
}

export const memoryService = new MemoryService();