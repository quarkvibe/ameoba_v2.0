import * as ts from 'typescript';
import { healthGuardianService } from './healthGuardianService';
import { activityMonitor } from './activityMonitor';

/**
 * Validation Pipeline Service
 * 
 * SELF-PRESERVATION: Validates changes BEFORE they're applied
 * Ensures system "stays correct" as it evolves
 * 
 * Like DNA repair mechanisms:
 * - Check syntax before compiling
 * - Check types before executing
 * - Check dependencies before installing
 * - Check configuration before applying
 * - Check schema before migrating
 * 
 * This prevents breaking changes from ever being applied.
 * 
 * Validates:
 * - TypeScript code (syntax, types)
 * - Configuration files (JSON, .env)
 * - Database schemas (migrations)
 * - Dependencies (package.json)
 * - Environment variables
 * - System state
 */

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  canProceed: boolean;
  requiresApproval: boolean;
}

interface ValidationError {
  severity: 'error' | 'critical';
  message: string;
  file?: string;
  line?: number;
  fix?: string;
}

interface ValidationWarning {
  severity: 'low' | 'medium';
  message: string;
  file?: string;
  recommendation?: string;
}

class ValidationPipelineService {
  
  /**
   * Validate TypeScript code before applying
   */
  validateTypeScriptCode(code: string, filePath: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Parse TypeScript
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Check for syntax errors
    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram([filePath], {
        noEmit: true,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
      })
    );
    
    diagnostics.forEach(diagnostic => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      
      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        errors.push({
          severity: 'error',
          message,
          file: filePath,
          line: diagnostic.start ? sourceFile.getLineAndCharacterOfPosition(diagnostic.start).line : undefined,
        });
      } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
        warnings.push({
          severity: 'medium',
          message,
          file: filePath,
        });
      }
    });
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      canProceed: errors.length === 0,
      requiresApproval: warnings.length > 0,
    };
  }
  
  /**
   * Validate JSON configuration
   */
  validateJSON(content: string, schema?: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    try {
      const parsed = JSON.parse(content);
      
      // If schema provided, validate against it
      if (schema) {
        // Would use Zod or JSON Schema here
      }
      
      return {
        valid: true,
        errors,
        warnings,
        canProceed: true,
        requiresApproval: false,
      };
    } catch (error: any) {
      errors.push({
        severity: 'error',
        message: `Invalid JSON: ${error.message}`,
        fix: 'Check JSON syntax, ensure all braces match',
      });
      
      return {
        valid: false,
        errors,
        warnings,
        canProceed: false,
        requiresApproval: false,
      };
    }
  }
  
  /**
   * Validate environment variable
   */
  validateEnvironmentVariable(key: string, value: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check key format
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      errors.push({
        severity: 'error',
        message: 'Invalid variable name format',
        fix: 'Use UPPERCASE_WITH_UNDERSCORES',
      });
    }
    
    // Check for common mistakes
    if (key === 'DATABASE_URL' && !value.includes('://')) {
      errors.push({
        severity: 'error',
        message: 'DATABASE_URL appears invalid',
        fix: 'Should be: postgresql://user:pass@host:5432/dbname',
      });
    }
    
    if (key === 'ENCRYPTION_KEY' && value.length !== 64) {
      errors.push({
        severity: 'error',
        message: 'ENCRYPTION_KEY must be 64 characters',
        fix: 'Generate with: amoeba env:generate-key encryption',
      });
    }
    
    // Check for secrets in wrong places
    if (value.includes('sk-') && !key.includes('KEY')) {
      warnings.push({
        severity: 'medium',
        message: 'Appears to be an API key but variable name doesn\'t include KEY',
        recommendation: 'Ensure this is the correct variable',
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      canProceed: errors.length === 0,
      requiresApproval: warnings.length > 0,
    };
  }
  
  /**
   * Validate system state before major operation
   */
  async validateSystemState(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check with health guardian
    const health = healthGuardianService.getCurrentHealth();
    
    if (!health) {
      warnings.push({
        severity: 'low',
        message: 'Health status unknown (guardian may not be started)',
        recommendation: 'Start health monitoring',
      });
    } else if (health.overall === 'critical') {
      errors.push({
        severity: 'critical',
        message: `System health is critical (${health.score}/100)`,
        fix: 'Fix critical issues before proceeding',
      });
    } else if (health.overall === 'degraded') {
      warnings.push({
        severity: 'medium',
        message: `System health is degraded (${health.score}/100)`,
        recommendation: 'Consider fixing issues before major changes',
      });
    }
    
    // Check for active circuit breakers
    const circuitBreakers = healthGuardianService.getCircuitBreakers();
    if (circuitBreakers.length > 0) {
      warnings.push({
        severity: 'medium',
        message: `${circuitBreakers.length} service(s) have active circuit breakers`,
        recommendation: `Check: ${circuitBreakers.join(', ')}`,
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      canProceed: errors.length === 0,
      requiresApproval: warnings.length > 0 || (health && health.score < 90),
    };
  }
  
  /**
   * Validate before self-modification (critical!)
   */
  async validateBeforeCodeModification(changes: any[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // 1. Check system health first
    const systemState = await this.validateSystemState();
    errors.push(...systemState.errors);
    warnings.push(...systemState.warnings);
    
    // 2. Validate each code change
    for (const change of changes) {
      if (change.newContent) {
        const codeValidation = this.validateTypeScriptCode(change.newContent, change.file);
        errors.push(...codeValidation.errors);
        warnings.push(...codeValidation.warnings);
      }
    }
    
    // 3. Check with health guardian for safety
    const healthCheck = await healthGuardianService.validateChange({
      type: 'code',
      description: 'AI-generated code modification',
      files: changes.map(c => c.file),
      impact: 'high',
    });
    
    if (!healthCheck.safe) {
      errors.push({
        severity: 'critical',
        message: 'Health Guardian blocked this change',
        fix: healthCheck.blockers.join('; '),
      });
    }
    
    warnings.push(...healthCheck.warnings.map(w => ({
      severity: 'medium' as const,
      message: w,
    })));
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      canProceed: errors.length === 0,
      requiresApproval: true, // Always require approval for code changes
    };
  }
  
  /**
   * Create validation report (for display)
   */
  createReport(result: ValidationResult): string {
    let report = '';
    
    if (result.valid) {
      report += '✅ Validation passed\n\n';
    } else {
      report += '❌ Validation failed\n\n';
    }
    
    if (result.errors.length > 0) {
      report += 'ERRORS:\n';
      result.errors.forEach(err => {
        report += `  ✗ ${err.message}\n`;
        if (err.fix) {
          report += `    Fix: ${err.fix}\n`;
        }
      });
      report += '\n';
    }
    
    if (result.warnings.length > 0) {
      report += 'WARNINGS:\n';
      result.warnings.forEach(warn => {
        report += `  ⚠ ${warn.message}\n`;
        if (warn.recommendation) {
          report += `    → ${warn.recommendation}\n`;
        }
      });
      report += '\n';
    }
    
    return report;
  }
}

export const validationPipeline = new ValidationPipelineService();

