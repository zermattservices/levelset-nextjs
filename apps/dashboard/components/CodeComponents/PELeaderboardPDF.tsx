import * as React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { LeaderboardEntry } from '@/lib/ratings-data';
import { formatTenure } from '@/lib/ratings-data';

/**
 * Resolved design token values for @react-pdf/renderer.
 * react-pdf uses its own layout engine and cannot resolve CSS custom properties.
 */
const TOKEN = {
  brand: '#31664A',
  mutedBorder: '#E5E7EB',
  muted: '#6B7280',
  mutedSoft: '#F3F4F6',
  neutral: '#374151',
  neutralForeground: '#F9FAFB',
  neutralSoftForeground: '#111827',
  bgContainer: '#FFFFFF',
  disabledText: '#9CA3AF',
} as const;

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: TOKEN.bgContainer,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: TOKEN.mutedBorder,
  },
  logo: {
    width: 50,
    height: 50,
    objectFit: 'contain',
  },
  headerText: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TOKEN.neutralSoftForeground,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: TOKEN.muted,
  },
  filterInfo: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
    padding: 12,
    backgroundColor: TOKEN.neutralForeground,
    borderRadius: 6,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 9,
    color: TOKEN.muted,
    marginRight: 6,
    textTransform: 'uppercase',
  },
  filterValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TOKEN.neutral,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: TOKEN.mutedSoft,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKEN.mutedBorder,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKEN.mutedSoft,
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  colRank: {
    width: 40,
  },
  colName: {
    flex: 1,
  },
  colRole: {
    width: 100,
  },
  colRating: {
    width: 60,
    textAlign: 'right',
  },
  colRatings: {
    width: 60,
    textAlign: 'right',
  },
  colTenure: {
    width: 80,
    textAlign: 'right',
  },
  headerCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: TOKEN.muted,
    textTransform: 'uppercase',
  },
  cell: {
    fontSize: 10,
    color: TOKEN.neutral,
  },
  cellBold: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TOKEN.neutralSoftForeground,
  },
  cellGreen: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TOKEN.brand,
  },
  cellMuted: {
    fontSize: 10,
    color: TOKEN.disabledText,
    fontStyle: 'italic',
  },
  topThreeSection: {
    marginBottom: 20,
  },
  topThreeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: TOKEN.neutralSoftForeground,
    marginBottom: 10,
  },
  topThreeCards: {
    flexDirection: 'row',
    gap: 12,
  },
  topCard: {
    flex: 1,
    padding: 12,
    backgroundColor: TOKEN.bgContainer,
    borderWidth: 1,
    borderColor: TOKEN.mutedBorder,
    borderRadius: 8,
  },
  topCardRank: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  topCardName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: TOKEN.neutralSoftForeground,
    marginBottom: 2,
  },
  topCardRole: {
    fontSize: 9,
    color: TOKEN.muted,
    marginBottom: 8,
  },
  topCardMetric: {
    marginBottom: 4,
  },
  topCardMetricLabel: {
    fontSize: 7,
    color: TOKEN.disabledText,
    textTransform: 'uppercase',
  },
  topCardMetricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: TOKEN.brand,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: TOKEN.disabledText,
  },
});

interface PELeaderboardPDFProps {
  entries: LeaderboardEntry[];
  area: 'FOH' | 'BOH';
  dateRange: { start: string; end: string };
  logoUrl: string;
  minRatings?: number;
}

export function PELeaderboardPDF({ entries, area, dateRange, logoUrl, minRatings = 1 }: PELeaderboardPDFProps) {
  const rankedEntries = entries.filter(e => e.total_ratings >= minRatings && e.overall_rating !== null);
  const unrankedEntries = entries.filter(e => e.total_ratings < minRatings || e.overall_rating === null);
  const top3 = rankedEntries.slice(0, 3);
  const rest = [...rankedEntries.slice(3), ...unrankedEntries];
  
  const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Positional Excellence Leaderboard</Text>
            <Text style={styles.subtitle}>
              Generated on {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        {/* Filter Info */}
        <View style={styles.filterInfo}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Area:</Text>
            <Text style={styles.filterValue}>{area}</Text>
          </View>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Date Range:</Text>
            <Text style={styles.filterValue}>{dateRange.start} - {dateRange.end}</Text>
          </View>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Total Employees:</Text>
            <Text style={styles.filterValue}>{entries.length}</Text>
          </View>
        </View>
        
        {/* Top 3 Cards */}
        {top3.length > 0 && (
          <View style={styles.topThreeSection}>
            <Text style={styles.topThreeTitle}>Top Performers</Text>
            <View style={styles.topThreeCards}>
              {top3.map((entry, index) => (
                <View key={entry.employee_id} style={styles.topCard}>
                  <Text style={[styles.topCardRank, { color: rankColors[index] }]}>
                    #{index + 1}
                  </Text>
                  <Text style={styles.topCardName}>{entry.employee_name}</Text>
                  <Text style={styles.topCardRole}>{entry.role || 'Team Member'}</Text>
                  <View style={styles.topCardMetric}>
                    <Text style={styles.topCardMetricLabel}>Overall Rating</Text>
                    <Text style={styles.topCardMetricValue}>
                      {entry.overall_rating?.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Table */}
        <View>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.colRank]}>Rank</Text>
            <Text style={[styles.headerCell, styles.colName]}>Name</Text>
            <Text style={[styles.headerCell, styles.colRole]}>Role</Text>
            <Text style={[styles.headerCell, styles.colRating]}>Rating</Text>
            <Text style={[styles.headerCell, styles.colRatings]}>Ratings</Text>
            <Text style={[styles.headerCell, styles.colTenure]}>Tenure</Text>
          </View>
          
          {/* Table Rows */}
          {rest.map((entry, index) => {
            const rank = entry.ratings_needed === 0 ? top3.length + index + 1 : null;
            return (
              <View
                key={entry.employee_id}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[rank ? styles.cellBold : styles.cellMuted, styles.colRank]}>
                  {rank || '—'}
                </Text>
                <Text style={[styles.cellBold, styles.colName]}>
                  {entry.employee_name}
                </Text>
                <Text style={[styles.cell, styles.colRole]}>
                  {entry.role || 'Team Member'}
                </Text>
                <Text style={[entry.overall_rating ? styles.cellGreen : styles.cellMuted, styles.colRating]}>
                  {entry.overall_rating ? entry.overall_rating.toFixed(2) : `${entry.ratings_needed} more`}
                </Text>
                <Text style={[styles.cell, styles.colRatings]}>
                  {entry.total_ratings}
                </Text>
                <Text style={[styles.cell, styles.colTenure]}>
                  {formatTenure(entry.tenure_months)}
                </Text>
              </View>
            );
          })}
        </View>
        
        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Levelset - Positional Excellence</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export default PELeaderboardPDF;
