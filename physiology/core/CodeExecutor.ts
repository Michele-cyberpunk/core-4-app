
import { GenerateContentResponse } from '@google/genai';
import { callAIWithRetries } from '../../services/learningService';
import { CORE_MODEL_NAMES } from '../../constants';
import { ai } from '../../services/ai';

interface ExecutionResult {
    success: boolean;
    output: string;
    errors: string[];
    executionTime: number;
    resourceUsage: ResourceMetrics;
}

interface ResourceMetrics {
    memoryUsed: number;
    cpuTime: number; // In milliseconds
    networkCalls: number;
}

interface SafetyReport {
    safe: boolean;
    risks: string[];
    recommendations: string[];
    restrictions: string[];
}

export class CodeExecutor {
    private maxExecutionTime = 30000; // 30 seconds

    constructor() {}

    async executeCode(
        code: string,
        language: 'typescript' | 'javascript' | 'python' = 'typescript'
    ): Promise<ExecutionResult> {
        const startTime = Date.now();

        try {
            const safetyReport = await this.validateCodeSafety(code);
            if (!safetyReport.safe) {
                return {
                    success: false,
                    output: '',
                    errors: safetyReport.risks,
                    executionTime: Date.now() - startTime,
                    resourceUsage: { memoryUsed: 0, cpuTime: 0, networkCalls: 0 }
                };
            }

            const result = await this.executeInSandbox(code, language);

            return {
                ...result,
                executionTime: Date.now() - startTime
            };

        } catch (error) {
            return {
                success: false,
                output: '',
                errors: [error instanceof Error ? error.message : String(error)],
                executionTime: Date.now() - startTime,
                resourceUsage: { memoryUsed: 0, cpuTime: 0, networkCalls: 0 }
            };
        }
    }

    private getRiskDescription(index: number): string {
        const descriptions = [
            'Process termination', 'File system access', 'File system import',
            'Dynamic code evaluation', 'Function constructor', 'DOM manipulation',
            'Window object access', 'Global object access', 'Network fetch',
            'XMLHttpRequest usage', 'Local storage access', 'Session storage access'
        ];
        return descriptions[index] || 'Unknown security risk';
    }

    private getSecurityRestrictions(): string[] {
        return [
            'No file system access', 'No network operations', 'No DOM access',
            'Limited execution time (30s)'
        ];
    }

    private async validateCodeSafety(code: string): Promise<SafetyReport> {
        const dangerousPatterns = [
            /process\.exit/g, /require\(/g, /import.*fs.*from/g,
            /eval\(/g, /new Function\(/g, /document\./g, /window\./g,
            /global\./g, /fetch\(/g, /XMLHttpRequest/g,
            /localStorage/g, /sessionStorage/g
        ];

        const risks: string[] = [];
        dangerousPatterns.forEach((pattern, index) => {
            if (pattern.test(code)) {
                risks.push(this.getRiskDescription(index));
            }
        });

        const aiAnalysis = await this.performAISafetyAnalysis(code);

        return {
            safe: risks.length === 0 && aiAnalysis.safe,
            risks: [...risks, ...aiAnalysis.risks],
            recommendations: aiAnalysis.recommendations,
            restrictions: this.getSecurityRestrictions()
        };
    }

    private async performAISafetyAnalysis(code: string): Promise<{safe: boolean, risks: string[], recommendations: string[]}> {
        try {
            const prompt = `Analyze this code for security risks and malicious behavior. Focus on: data access, network ops, system mods, resource exhaustion, privilege escalation. Code: \`\`\`${code}\`\`\` Respond with JSON only: { "safe": boolean, "risks": [], "recommendations": [] }`;
            const response: GenerateContentResponse = await callAIWithRetries(
                (model) => ai.models.generateContent({
                    model,
                    contents: [{ parts: [{ text: prompt }] }],
                    config: { responseMimeType: "application/json" }
                }),
                CORE_MODEL_NAMES
            );

            if (!response.text) {
                return { safe: false, risks: ['AI safety analysis failed: invalid response format'], recommendations: ['Manual review required'] };
            }

            const text = response.text;
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            const jsonString = jsonMatch ? jsonMatch[1] : text;
            return JSON.parse(jsonString.trim());
        } catch (error) {
            return { safe: false, risks: ['AI safety analysis failed'], recommendations: ['Manual review required'] };
        }
    }

    private async executeInSandbox(code: string, language: string): Promise<Omit<ExecutionResult, 'executionTime'>> {
        const resourceUsage: ResourceMetrics = { memoryUsed: 0, cpuTime: 0, networkCalls: 0 };
        try {
             if (language === 'typescript') {
                const ts = await import('typescript');
                code = ts.transpile(code);
            }
            if (language === 'typescript' || language === 'javascript') {
                const { output, executionTime } = await this.executeJavaScriptWithWorker(code);
                resourceUsage.cpuTime = executionTime;
                resourceUsage.memoryUsed = (performance as any).memory?.usedJSHeapSize || 0;

                return { success: true, output, errors: [], resourceUsage };
            } else {
                throw new Error(`Language ${language} not supported in browser sandbox`);
            }
        } catch (error) {
            return { success: false, output: '', errors: [error instanceof Error ? error.message : String(error)], resourceUsage };
        }
    }

    private executeJavaScriptWithWorker(code: string): Promise<{ output: string, executionTime: number }> {
        return new Promise((resolve, reject) => {
            const workerScript = `
                self.fetch = () => Promise.reject('Fetch API is disabled.');
                self.XMLHttpRequest = function() { throw new Error('XMLHttpRequest is disabled.'); };
                let consoleOutput = [];
                self.console = {
                    log: (...args) => consoleOutput.push(args.join(' ')),
                    error: (...args) => consoleOutput.push('ERROR: ' + args.join(' ')),
                    warn: (...args) => consoleOutput.push('WARN: ' + args.join(' ')),
                };

                self.onmessage = (event) => {
                    const startTime = performance.now();
                    try {
                        const result = (new Function(event.data))();
                        const executionTime = performance.now() - startTime;
                        self.postMessage({ success: true, result, output: consoleOutput.join('\\n'), executionTime });
                    } catch (err) {
                        const executionTime = performance.now() - startTime;
                        self.postMessage({ success: false, error: err.message, output: consoleOutput.join('\\n'), executionTime });
                    }
                };
            `;
            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));

            const timeout = setTimeout(() => {
                worker.terminate();
                reject(new Error(`Execution timed out after ${this.maxExecutionTime}ms`));
            }, this.maxExecutionTime);

            worker.onmessage = msgEvent => {
                clearTimeout(timeout);
                const { success, result, output, executionTime } = msgEvent.data;
                if (success) {
                    const fullOutput = (output ? output + '\\n' : '') + (String(result ?? ''));
                    resolve({ output: fullOutput, executionTime });
                } else {
                    const fullOutput = (output ? output + '\\n' : '') + `Error: ${msgEvent.data.error}`;
                    reject(new Error(fullOutput));
                }
                worker.terminate();
            };

            worker.onerror = errorEvent => {
                clearTimeout(timeout);
                reject(new Error(`Worker error: ${errorEvent.message}`));
                worker.terminate();
            };

            worker.postMessage(code);
        });
    }
}
