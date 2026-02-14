import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image, Link } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';

// Register Satoshi variable font
Font.register({
  family: 'Satoshi',
  fonts: [
    { src: '/fonts/Satoshi-Variable.ttf', fontWeight: 400 },
    { src: '/fonts/Satoshi-Variable.ttf', fontWeight: 500 },
    { src: '/fonts/Satoshi-Variable.ttf', fontWeight: 600 },
    { src: '/fonts/Satoshi-Variable.ttf', fontWeight: 700 },
  ]
});

// Colors
const colors = {
  levelsetGreen: '#31664a', // TODO: Use design token
  grey100: '#f9fafb',
  grey200: '#e5e7eb',
  grey300: '#d1d5db',
  grey600: '#6b7280',
  grey900: '#111827',
  white: '#ffffff',
  red: '#dc2626',
  redLight: '#fee2e2',
  orange: '#f59e0b',
  orangeLight: '#fef3c7',
  blue: '#2563eb',
  blueLight: '#dbeafe',
};

// Styles
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 30,
    fontFamily: 'Satoshi',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.levelsetGreen,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.levelsetGreen,
  },
  subtitle: {
    fontSize: 10,
    color: colors.grey600,
    marginTop: 2,
  },
  logo: {
    width: 70,
    height: 70,
    objectFit: 'contain',
  },
  // Employee Info Section
  employeeInfoSection: {
    marginBottom: 8,
    padding: 14,
    backgroundColor: colors.grey100,
    borderRadius: 10,
  },
  employeeInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  employeeInfoItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  employeeInfoLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: colors.grey600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  employeeInfoValue: {
    fontSize: 12,
    fontWeight: 500,
    color: colors.grey900,
  },
  pointsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsBadgeText: {
    fontSize: 12,
    fontWeight: 600,
  },
  // Section Headers
  sectionHeader: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.grey900,
    marginBottom: 8,
    marginTop: 8,
  },
  // Log Entry Styles
  logEntry: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.grey200,
    borderRadius: 8,
  },
  logEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  logEntryTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.grey900,
    flex: 1,
  },
  logEntryTypeLabel: {
    fontSize: 10,
    fontWeight: 500,
    color: colors.grey600,
  },
  logEntryDate: {
    fontSize: 10,
    color: colors.grey600,
  },
  logEntryDetails: {
    flexDirection: 'column',
    gap: 3,
  },
  logEntryRow: {
    flexDirection: 'row',
    fontSize: 10,
  },
  logEntryLabel: {
    fontWeight: 600,
    color: colors.grey600,
    width: 70,
  },
  logEntryValue: {
    color: colors.grey900,
    flex: 1,
  },
  signaturesRow: {
    flexDirection: 'row',
    fontSize: 10,
    alignItems: 'center',
    marginTop: 4,
    gap: 16,
  },
  signatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signatureLabel: {
    fontWeight: 600,
    color: colors.grey600,
    marginRight: 4,
  },
  signatureImage: {
    width: 80,
    height: 30,
    objectFit: 'contain',
  },
  logEntryNotes: {
    marginTop: 6,
    padding: 8,
    backgroundColor: colors.grey100,
    borderRadius: 4,
    fontSize: 10,
    color: colors.grey600,
    flexDirection: 'row',
  },
  logEntryNotesLabel: {
    fontWeight: 600,
    color: colors.grey600,
    fontSize: 10,
  },
  logEntryNotesText: {
    fontWeight: 400,
    color: colors.grey600,
    fontSize: 10,
    flex: 1,
  },
  pointsPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  pointsPillText: {
    fontSize: 10,
    fontWeight: 600,
  },
  actionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    backgroundColor: colors.blueLight,
  },
  actionPillText: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.blue,
  },
  // Action Thresholds Table
  thresholdsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.grey200,
  },
  thresholdsTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.grey900,
    marginBottom: 10,
  },
  thresholdsTable: {
    borderWidth: 1,
    borderColor: colors.grey200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thresholdsHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.grey100,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey200,
  },
  thresholdsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.grey200,
  },
  thresholdsRowLast: {
    flexDirection: 'row',
  },
  thresholdsCell: {
    padding: 8,
    fontSize: 10,
    color: colors.grey900,
  },
  thresholdsHeaderCell: {
    padding: 8,
    fontSize: 10,
    fontWeight: 600,
    color: colors.grey600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  thresholdsCellPoints: {
    width: 80,
    textAlign: 'center',
  },
  thresholdsCellAction: {
    flex: 1,
  },
  // Empty State
  emptyState: {
    padding: 16,
    textAlign: 'center',
    color: colors.grey600,
    fontSize: 11,
  },
  // Footer
  footer: {
    position: 'absolute',
    fontSize: 9,
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerLogo: {
    width: 50,
    height: 16,
    objectFit: 'contain',
  },
  footerDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.grey600,
  },
  pageNumber: {
    fontSize: 9,
    color: colors.grey600,
  },
});

interface Infraction {
  id: string;
  infraction_date: string;
  infraction: string;
  points: number;
  leader_name: string | null;
  notes: string | null;
  acknowledgement: string | null;
  ack_bool: boolean | null;
  leader_signature: string | null;
  team_member_signature: string | null;
  created_at: string;
}

interface DisciplinaryAction {
  id: string;
  action_date: string;
  action: string;
  leader_name: string | null;
  notes: string | null;
  created_at: string;
}

interface ActionThreshold {
  points_threshold: number;
  action: string;
}

interface DisciplineReportPDFProps {
  employeeName: string;
  employeeRole: string;
  hireDate: string | null;
  currentPoints: number;
  logoUrl?: string;
  infractions: Infraction[];
  actions: DisciplinaryAction[];
  actionThresholds: ActionThreshold[];
}

// Combined type for sorting
type DisciplineEntry = 
  | { type: 'infraction'; date: string; data: Infraction }
  | { type: 'action'; date: string; data: DisciplinaryAction };

const getPointsBadgeStyle = (points: number) => {
  if (points === 0) {
    return { bg: colors.grey200, color: colors.grey900 };
  }
  if (points < 5) {
    return { bg: colors.orangeLight, color: colors.orange };
  }
  return { bg: colors.redLight, color: colors.red };
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
  } catch {
    return dateString;
  }
};

export const DisciplineReportPDF: React.FC<DisciplineReportPDFProps> = ({
  employeeName,
  employeeRole,
  hireDate,
  currentPoints,
  logoUrl,
  infractions,
  actions,
  actionThresholds,
}) => {
  const pointsStyle = getPointsBadgeStyle(currentPoints);
  
  // Combine infractions and actions into a single sorted list (oldest to newest)
  const combinedEntries: DisciplineEntry[] = [
    ...infractions.map((inf): DisciplineEntry => ({ 
      type: 'infraction', 
      date: inf.infraction_date, 
      data: inf 
    })),
    ...actions.map((act): DisciplineEntry => ({ 
      type: 'action', 
      date: act.action_date, 
      data: act 
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const sortedThresholds = [...actionThresholds].sort((a, b) => a.points_threshold - b.points_threshold);
  const totalEntries = infractions.length + actions.length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Discipline Report</Text>
            <Text style={styles.subtitle}>
              Generated on {format(new Date(), 'MMMM d, yyyy')} at {format(new Date(), 'h:mm a')}
            </Text>
          </View>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
        </View>

        {/* Employee Info Section */}
        <View style={styles.employeeInfoSection}>
          <View style={styles.employeeInfoGrid}>
            <View style={styles.employeeInfoItem}>
              <Text style={styles.employeeInfoLabel}>Employee Name</Text>
              <Text style={styles.employeeInfoValue}>{employeeName}</Text>
            </View>
            <View style={styles.employeeInfoItem}>
              <Text style={styles.employeeInfoLabel}>Role</Text>
              <Text style={styles.employeeInfoValue}>{employeeRole}</Text>
            </View>
            <View style={styles.employeeInfoItem}>
              <Text style={styles.employeeInfoLabel}>Hire Date</Text>
              <Text style={styles.employeeInfoValue}>{formatDate(hireDate)}</Text>
            </View>
            <View style={styles.employeeInfoItem}>
              <Text style={styles.employeeInfoLabel}>Total Points</Text>
              <View style={[styles.pointsBadge, { backgroundColor: pointsStyle.bg }]}>
                <Text style={[styles.pointsBadgeText, { color: pointsStyle.color }]}>
                  {currentPoints} points
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Combined Discipline History */}
        <Text style={styles.sectionHeader}>Discipline History ({totalEntries} total)</Text>
        {combinedEntries.length === 0 ? (
          <Text style={styles.emptyState}>No discipline history recorded for this employee.</Text>
        ) : (
          combinedEntries.map((entry, index) => {
            if (entry.type === 'infraction') {
              const infraction = entry.data as Infraction;
              const hasTmSig = infraction.team_member_signature;
              const hasLeaderSig = infraction.leader_signature;
              const hasAnySig = hasTmSig || hasLeaderSig;
              
              return (
                <View key={`inf-${infraction.id || index}`} style={styles.logEntry} wrap={false}>
                  <View style={styles.logEntryHeader}>
                    <Text style={styles.logEntryTitle}>
                      <Text style={styles.logEntryTypeLabel}>Infraction: </Text>
                      {infraction.infraction || 'Infraction'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.logEntryDate}>{formatDate(infraction.infraction_date)}</Text>
                      <View style={[styles.pointsPill, { backgroundColor: colors.redLight }]}>
                        <Text style={[styles.pointsPillText, { color: colors.red }]}>
                          +{infraction.points} pts
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.logEntryDetails}>
                    <View style={styles.logEntryRow}>
                      <Text style={styles.logEntryLabel}>Issued By:</Text>
                      <Text style={styles.logEntryValue}>{infraction.leader_name || 'Unknown'}</Text>
                    </View>
                    <View style={styles.logEntryRow}>
                      <Text style={styles.logEntryLabel}>Recorded:</Text>
                      <Text style={styles.logEntryValue}>{formatDateTime(infraction.created_at)}</Text>
                    </View>
                    {hasAnySig && (
                      <View style={styles.signaturesRow}>
                        {hasTmSig && (
                          <View style={styles.signatureItem}>
                            <Text style={styles.signatureLabel}>TM:</Text>
                            {infraction.team_member_signature?.startsWith('data:image') ? (
                              <Image src={infraction.team_member_signature} style={styles.signatureImage} />
                            ) : (
                              <Text style={{ fontSize: 10, color: colors.grey900 }}>Signed</Text>
                            )}
                          </View>
                        )}
                        {hasLeaderSig && (
                          <View style={styles.signatureItem}>
                            <Text style={styles.signatureLabel}>Leader:</Text>
                            {infraction.leader_signature?.startsWith('data:image') ? (
                              <Image src={infraction.leader_signature} style={styles.signatureImage} />
                            ) : (
                              <Text style={{ fontSize: 10, color: colors.grey900 }}>Signed</Text>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  {infraction.notes && (
                    <View style={styles.logEntryNotes}>
                      <Text style={styles.logEntryNotesLabel}>Notes: </Text>
                      <Text style={styles.logEntryNotesText}>{infraction.notes}</Text>
                    </View>
                  )}
                </View>
              );
            } else {
              const action = entry.data as DisciplinaryAction;
              return (
                <View key={`act-${action.id || index}`} style={styles.logEntry} wrap={false}>
                  <View style={styles.logEntryHeader}>
                    <Text style={styles.logEntryTitle}>
                      <Text style={styles.logEntryTypeLabel}>Action: </Text>
                      {action.action || 'Action'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.logEntryDate}>{formatDate(action.action_date)}</Text>
                      <View style={styles.actionPill}>
                        <Text style={styles.actionPillText}>Action</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.logEntryDetails}>
                    <View style={styles.logEntryRow}>
                      <Text style={styles.logEntryLabel}>Issued By:</Text>
                      <Text style={styles.logEntryValue}>{action.leader_name || 'Unknown'}</Text>
                    </View>
                    <View style={styles.logEntryRow}>
                      <Text style={styles.logEntryLabel}>Recorded:</Text>
                      <Text style={styles.logEntryValue}>{formatDateTime(action.created_at)}</Text>
                    </View>
                  </View>
                  {action.notes && (
                    <View style={styles.logEntryNotes}>
                      <Text style={styles.logEntryNotesLabel}>Notes: </Text>
                      <Text style={styles.logEntryNotesText}>{action.notes}</Text>
                    </View>
                  )}
                </View>
              );
            }
          })
        )}

        {/* Action Thresholds Table */}
        <View style={styles.thresholdsSection}>
          <Text style={styles.thresholdsTitle}>Disciplinary Action Thresholds</Text>
          {sortedThresholds.length === 0 ? (
            <Text style={styles.emptyState}>No action thresholds configured.</Text>
          ) : (
            <View style={styles.thresholdsTable}>
              <View style={styles.thresholdsHeaderRow}>
                <Text style={[styles.thresholdsHeaderCell, styles.thresholdsCellPoints]}>Points</Text>
                <Text style={[styles.thresholdsHeaderCell, styles.thresholdsCellAction]}>Action</Text>
              </View>
              {sortedThresholds.map((threshold, index) => (
                <View 
                  key={index} 
                  style={index === sortedThresholds.length - 1 ? styles.thresholdsRowLast : styles.thresholdsRow}
                >
                  <Text style={[styles.thresholdsCell, styles.thresholdsCellPoints]}>
                    {threshold.points_threshold}+
                  </Text>
                  <Text style={[styles.thresholdsCell, styles.thresholdsCellAction]}>
                    {threshold.action}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Link src="https://app.levelset.io">
            <Image src="/logos/Levelset no margin.png" style={styles.footerLogo} />
          </Link>
          <View style={styles.footerDivider} />
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};

export default DisciplineReportPDF;
