/**
 * Alert Management Service
 * Handles alert generation, acknowledgment, escalation, and management
 */

import { apiService } from './api';
import { API_ENDPOINTS } from '@/config/api';
import type { 
  Alert, 
  AlertFilters, 
  AlertAcknowledgeInput,
  CovenantHealth,
  Covenant 
} from '@/types';

export interface AlertCreateInput {
  covenant_id: string;
  contract_id: string;
  alert_type: 'warning' | 'critical' | 'breach' | 'reporting_due';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  trigger_metric_value?: number;
  threshold_value?: number;
}

export interface AlertEscalationResult {
  alert_id: string;
  previous_severity: string;
  new_severity: string;
  escalated_at: string;
  reason: string;
}

export interface StatusChangeEvent {
  covenant_id: string;
  contract_id: string;
  previous_status: 'compliant' | 'warning' | 'breached';
  new_status: 'compliant' | 'warning' | 'breached';
  current_value: number;
  threshold_value: number;
  covenant_name: string;
  metric_name: string;
}

class AlertService {
  /**
   * Get all alerts with optional filtering
   */
  async getAlerts(filters?: AlertFilters): Promise<Alert[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    
    const url = params.toString() 
      ? `${API_ENDPOINTS.alerts.list}?${params.toString()}`
      : API_ENDPOINTS.alerts.list;
    
    const response = await apiService.get<Alert[]>(url);
    return response.data || [];
  }

  /**
   * Get a single alert by ID
   */
  async getAlert(alertId: string): Promise<Alert> {
    const response = await apiService.get<Alert>(API_ENDPOINTS.alerts.get(alertId));
    if (!response.data) {
      throw new Error('Alert not found');
    }
    return response.data;
  }

  /**
   * Create a new alert
   */
  async createAlert(input: AlertCreateInput): Promise<Alert> {
    const response = await apiService.post<Alert>(API_ENDPOINTS.alerts.list, input);
    if (!response.data) {
      throw new Error('Failed to create alert');
    }
    return response.data;
  }


  /**
   * Generate alert from covenant status change
   * Property 5: Alert Generation Trigger
   * For any covenant that changes status from compliant to warning or breached,
   * the system should create an alert with appropriate severity
   */
  async generateAlertFromStatusChange(event: StatusChangeEvent): Promise<Alert | null> {
    // Only generate alerts for status changes from compliant to warning/breached
    if (event.previous_status === 'compliant' && 
        (event.new_status === 'warning' || event.new_status === 'breached')) {
      
      // Determine alert type and severity based on new status
      const alertType = event.new_status === 'breached' ? 'breach' : 'warning';
      const severity = this.determineSeverity(event.new_status, event.current_value, event.threshold_value);
      
      const alertInput: AlertCreateInput = {
        covenant_id: event.covenant_id,
        contract_id: event.contract_id,
        alert_type: alertType,
        severity: severity,
        title: this.generateAlertTitle(event),
        description: this.generateAlertDescription(event),
        trigger_metric_value: event.current_value,
        threshold_value: event.threshold_value,
      };
      
      return this.createAlert(alertInput);
    }
    
    // Also generate alerts for warning to breached transitions
    if (event.previous_status === 'warning' && event.new_status === 'breached') {
      const alertInput: AlertCreateInput = {
        covenant_id: event.covenant_id,
        contract_id: event.contract_id,
        alert_type: 'breach',
        severity: 'critical',
        title: this.generateAlertTitle(event),
        description: this.generateAlertDescription(event),
        trigger_metric_value: event.current_value,
        threshold_value: event.threshold_value,
      };
      
      return this.createAlert(alertInput);
    }
    
    return null;
  }

  /**
   * Determine alert severity based on status and values
   */
  determineSeverity(
    status: 'warning' | 'breached',
    currentValue: number,
    thresholdValue: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (status === 'breached') {
      return 'critical';
    }
    
    // For warning status, determine severity based on buffer percentage
    const bufferPercentage = Math.abs((currentValue - thresholdValue) / thresholdValue) * 100;
    
    if (bufferPercentage <= 5) {
      return 'high'; // Very close to breach
    } else if (bufferPercentage <= 15) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate alert title from status change event
   */
  private generateAlertTitle(event: StatusChangeEvent): string {
    const statusText = event.new_status === 'breached' ? 'BREACH' : 'WARNING';
    return `Covenant ${statusText}: ${event.covenant_name}`;
  }

  /**
   * Generate alert description from status change event
   */
  private generateAlertDescription(event: StatusChangeEvent): string {
    return `${event.covenant_name} (${event.metric_name}) has moved from ${event.previous_status} to ${event.new_status}. ` +
           `Current value: ${event.current_value.toFixed(2)}, Threshold: ${event.threshold_value.toFixed(2)}.`;
  }

  /**
   * Acknowledge an alert
   * Property 6: Alert Acknowledgment Workflow
   */
  async acknowledgeAlert(
    alertId: string, 
    userId: string, 
    input?: AlertAcknowledgeInput
  ): Promise<Alert> {
    const response = await apiService.post<Alert>(
      API_ENDPOINTS.alerts.acknowledge(alertId),
      {
        acknowledged_by: userId,
        resolution_notes: input?.resolution_notes,
      }
    );
    
    if (!response.data) {
      throw new Error('Failed to acknowledge alert');
    }
    
    return response.data;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolutionNotes?: string): Promise<Alert> {
    const response = await apiService.post<Alert>(
      API_ENDPOINTS.alerts.resolve(alertId),
      { resolution_notes: resolutionNotes }
    );
    
    if (!response.data) {
      throw new Error('Failed to resolve alert');
    }
    
    return response.data;
  }

  /**
   * Escalate unacknowledged alerts
   * Increases severity for alerts that remain unacknowledged past threshold
   */
  async escalateAlert(alertId: string, reason: string): Promise<AlertEscalationResult> {
    const alert = await this.getAlert(alertId);
    
    // Determine new severity (escalate one level)
    const severityLevels: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
    const currentIndex = severityLevels.indexOf(alert.severity);
    const newSeverity = severityLevels[Math.min(currentIndex + 1, severityLevels.length - 1)];
    
    // Update alert with escalated status
    await apiService.put<Alert>(
      API_ENDPOINTS.alerts.get(alertId),
      {
        severity: newSeverity,
        status: 'escalated',
      }
    );
    
    return {
      alert_id: alertId,
      previous_severity: alert.severity,
      new_severity: newSeverity,
      escalated_at: new Date().toISOString(),
      reason: reason,
    };
  }

  /**
   * Check for alerts that need escalation
   * Returns alerts that are unacknowledged past the threshold time
   */
  async getAlertsForEscalation(thresholdMinutes: number = 60): Promise<Alert[]> {
    const alerts = await this.getAlerts({ status: 'new' });
    const now = new Date();
    
    return alerts.filter(alert => {
      const triggeredAt = new Date(alert.triggered_at);
      const minutesSinceTriggered = (now.getTime() - triggeredAt.getTime()) / (1000 * 60);
      return minutesSinceTriggered >= thresholdMinutes;
    });
  }

  /**
   * Process covenant health update and generate alerts if needed
   */
  async processCovenantHealthUpdate(
    covenant: Covenant,
    previousHealth: CovenantHealth | null,
    newHealth: CovenantHealth
  ): Promise<Alert | null> {
    const previousStatus = previousHealth?.status || 'compliant';
    const newStatus = newHealth.status;
    
    // Check if status changed in a way that requires an alert
    if (previousStatus !== newStatus) {
      const event: StatusChangeEvent = {
        covenant_id: covenant.id,
        contract_id: covenant.contract_id,
        previous_status: previousStatus,
        new_status: newStatus,
        current_value: newHealth.last_reported_value || 0,
        threshold_value: covenant.threshold_value || 0,
        covenant_name: covenant.covenant_name,
        metric_name: covenant.metric_name || 'unknown',
      };
      
      return this.generateAlertFromStatusChange(event);
    }
    
    return null;
  }

  /**
   * Get alert statistics for dashboard
   */
  async getAlertStats(): Promise<{
    total: number;
    new: number;
    acknowledged: number;
    escalated: number;
    by_severity: Record<string, number>;
  }> {
    const alerts = await this.getAlerts();
    
    const stats = {
      total: alerts.length,
      new: alerts.filter(a => a.status === 'new').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      escalated: alerts.filter(a => a.status === 'escalated').length,
      by_severity: {
        low: alerts.filter(a => a.severity === 'low').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        high: alerts.filter(a => a.severity === 'high').length,
        critical: alerts.filter(a => a.severity === 'critical').length,
      },
    };
    
    return stats;
  }
}

export const alertService = new AlertService();
