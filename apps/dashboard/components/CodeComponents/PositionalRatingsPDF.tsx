import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image, Link } from '@react-pdf/renderer';

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
  levelsetGreen: 'var(--ls-color-brand)',
  fohColor: '#006391',
  bohColor: '#ffcc5b',
  fohColorLight: '#eaf9ff',
  bohColorLight: '#fffcf0',
  ratingGreen: '#249e6b',
  ratingOrange: '#ffb549',
  ratingRed: '#ad2624',
  grey100: 'var(--ls-color-neutral-foreground)',
  grey200: 'var(--ls-color-muted-border)',
  grey600: 'var(--ls-color-muted)',
  grey900: 'var(--ls-color-neutral-soft-foreground)',
  trendGreen: '#38A169',
  trendRed: '#E53E3E',
  white: '#ffffff',
};

// Styles
const styles = StyleSheet.create({
  page: {
    backgroundColor: 'var(--ls-color-bg-container)',
    paddingTop: 15, // 0.5 inch top margin
    paddingBottom: 30,
    paddingHorizontal: 30,
    fontFamily: 'Satoshi',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.levelsetGreen,
  },
  logo: {
    width: 80,
    height: 80,
    objectFit: 'contain',
  },
  filtersSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.grey100,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 16,
  },
  filterColumn: {
    flex: 1,
    flexDirection: 'column',
    gap: 6,
  },
  filterRow: {
    flexDirection: 'row',
    fontSize: 11,
  },
  filterLabel: {
    fontWeight: 600,
    color: colors.grey900,
  },
  filterValue: {
    color: colors.grey600,
  },
  filterItem: {
    fontSize: 11,
    color: colors.grey900,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.grey200,
    padding: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  metricName: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.grey900,
  },
  trendBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },
  trendBadgeGreen: {
    backgroundColor: '#D4EDDA',
    color: colors.trendGreen,
  },
  trendBadgeRed: {
    backgroundColor: '#F8D7DA',
    color: colors.trendRed,
  },
  trendBadgeGrey: {
    backgroundColor: colors.grey200,
    color: colors.grey600,
  },
  metricValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.grey900,
  },
  metricDelta: {
    fontSize: 12,
    textAlign: 'right',
    color: colors.grey600,
    fontWeight: 400,
  },
  deltaNumber: {
    fontWeight: 600,
  },
  deltaGreen: {
    color: colors.trendGreen,
  },
  deltaRed: {
    color: colors.trendRed,
  },
  periodText: {
    fontSize: 12,
    color: colors.grey600,
  },
  table: {
    marginTop: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.grey100,
    borderBottomWidth: 2,
    borderBottomColor: colors.grey200,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.grey200,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minHeight: 32,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 9,
    color: colors.grey900,
    paddingHorizontal: 3,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTag: {
    fontSize: 7,
    fontWeight: 600,
    backgroundColor: 'var(--ls-color-muted-soft)',
    color: 'var(--ls-color-muted)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 3,
    lineHeight: 1.5,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 400,
    color: colors.grey900,
    paddingHorizontal: 3,
    textAlign: 'center',
  },
  // Column widths (no actions column, more space for criteria headers)
  colDate: { width: '13%' },
  colEmployee: { width: '14%' },
  colRole: { width: '12%' },
  colLeader: { width: '13%' },
  colPosition: { width: '11%' },
  colRating: { width: '7.4%' },
  colOverall: { width: '7.4%' },
  // Rating cells
  ratingCell: {
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontWeight: 600,
    color: colors.white,
  },
  ratingGreen: {
    backgroundColor: colors.ratingGreen,
  },
  ratingOrange: {
    backgroundColor: colors.ratingOrange,
  },
  ratingRed: {
    backgroundColor: colors.ratingRed,
  },
  // Role/Position pills
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 8,
    fontWeight: 600,
  },
  pillWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  rolePillNewHire: {
    backgroundColor: '#E6FAE6',
    color: '#2E8B57',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 8,
    fontWeight: 500,
  },
  rolePillTeamMember: {
    backgroundColor: '#E6F2FF',
    color: '#4169E1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 8,
    fontWeight: 500,
  },
  rolePillTrainer: {
    backgroundColor: '#FFF0F5',
    color: '#C71585',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 8,
    fontWeight: 500,
  },
  rolePillTeamLead: {
    backgroundColor: '#FFF0E6',
    color: '#A0522D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 8,
    fontWeight: 500,
  },
  rolePillDirector: {
    backgroundColor: '#F5F0FF',
    color: '#6A5ACD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 8,
    fontWeight: 500,
  },
  rolePillOperator: {
    backgroundColor: '#F0F0FF',
    color: '#483D8B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 8,
    fontWeight: 500,
  },
  rolePillExecutive: {
    backgroundColor: '#F0F0FF',
    color: '#483D8B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 8,
    fontWeight: 500,
  },
  fohPill: {
    backgroundColor: colors.fohColor,
    color: colors.white,
  },
  bohPill: {
    backgroundColor: colors.bohColor,
    color: colors.white,
  },
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

interface PDFDocumentProps {
  title: string;
  logoUrl?: string;
  filters: {
    dateRange: { start: string; end: string };
    fohSelected: boolean;
    bohSelected: boolean;
    searchText: string;
    columnFilters: Array<{ field: string; operator: string; value: string }>;
  };
  metrics: {
    ratingsCount: { value: number; change: number; percentChange: number; priorPeriod: string; hasPriorData: boolean };
    avgRating: { value: number; change: number; percentChange: number; priorPeriod: string; hasPriorData: boolean };
    ratingsPerDay: { value: number; change: number; percentChange: number; priorPeriod: string; hasPriorData: boolean };
  };
  tableData: Array<{
    date: string;
    employeeName: string;
    employeeRole: string;
    leaderName: string;
    position: string;
    isFOH: boolean;
    rating1: number | null;
    rating2: number | null;
    rating3: number | null;
    rating4: number | null;
    rating5: number | null;
    overall: number | null;
    locationNumber: string | null;
  }>;
}

const getRatingStyle = (rating: number | null) => {
  if (rating === null || rating === undefined) return null;
  if (rating >= 2.75) return styles.ratingGreen;
  if (rating >= 1.75) return styles.ratingOrange;
  return styles.ratingRed;
};

const getRolePillStyle = (role: string) => {
  switch (role) {
    case 'New Hire':
      return styles.rolePillNewHire;
    case 'Team Member':
      return styles.rolePillTeamMember;
    case 'Trainer':
      return styles.rolePillTrainer;
    case 'Team Lead':
      return styles.rolePillTeamLead;
    case 'Director':
      return styles.rolePillDirector;
    case 'Operator':
      return styles.rolePillOperator;
    case 'Executive':
      return styles.rolePillExecutive;
    default:
      return styles.rolePillTeamMember; // Default to Team Member style
  }
};

const formatFieldName = (field: string): string => {
  const fieldMap: { [key: string]: string } = {
    employee_name: 'Employee',
    employee_role: 'Employee Role',
    rater_name: 'Leader',
    position_cleaned: 'Position',
    rating_avg: 'Overall Rating',
  };
  return fieldMap[field] || field;
};

const formatOperator = (operator: string): string => {
  const operatorMap: { [key: string]: string } = {
    is: ':',
    isNot: '≠',
    isAnyOf: 'in',
  };
  return operatorMap[operator] || operator;
};

export const PositionalRatingsPDF: React.FC<PDFDocumentProps> = ({ 
  title, 
  logoUrl,
  filters, 
  metrics,
  tableData 
}) => {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header with Title and Logo */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
        </View>
        
        {/* Filters Section - 3 columns */}
        <View style={styles.filtersSection}>
          {/* Column 1: Date Range and Areas */}
          <View style={styles.filterColumn}>
            <Text style={styles.filterItem}>
              <Text style={styles.filterLabel}>Date Range: </Text>
              <Text style={styles.filterValue}>
                {filters.dateRange.start} - {filters.dateRange.end}
              </Text>
            </Text>
            <Text style={styles.filterItem}>
              <Text style={styles.filterLabel}>Areas: </Text>
              <Text style={styles.filterValue}>
                {filters.fohSelected && 'FOH'} {filters.fohSelected && filters.bohSelected && '+ '}
                {filters.bohSelected && 'BOH'}
              </Text>
            </Text>
          </View>
          
          {/* Column 2: Search + First half of column filters */}
          <View style={styles.filterColumn}>
            {filters.searchText && (
              <Text style={styles.filterItem}>
                <Text style={styles.filterLabel}>Search: </Text>
                <Text style={styles.filterValue}>{filters.searchText}</Text>
              </Text>
            )}
            {filters.columnFilters.slice(0, Math.ceil(filters.columnFilters.length / 2)).map((f, idx) => (
              <Text key={idx} style={styles.filterItem}>
                <Text style={styles.filterLabel}>{formatFieldName(f.field)}{formatOperator(f.operator)} </Text>
                <Text style={styles.filterValue}>{f.value}</Text>
              </Text>
            ))}
          </View>
          
          {/* Column 3: Second half of column filters */}
          <View style={styles.filterColumn}>
            {filters.columnFilters.slice(Math.ceil(filters.columnFilters.length / 2)).map((f, idx) => (
              <Text key={idx} style={styles.filterItem}>
                <Text style={styles.filterLabel}>{formatFieldName(f.field)}{formatOperator(f.operator)} </Text>
                <Text style={styles.filterValue}>{f.value}</Text>
              </Text>
            ))}
          </View>
        </View>
        
        {/* Metrics Cards */}
        <View style={styles.metricsContainer}>
          {/* # of Ratings */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricName}># of Ratings</Text>
              <View style={[
                styles.trendBadge, 
                metrics.ratingsCount.hasPriorData
                  ? (metrics.ratingsCount.percentChange >= 0 ? styles.trendBadgeGreen : styles.trendBadgeRed)
                  : styles.trendBadgeGrey
              ]}>
                <Text>
                  {metrics.ratingsCount.hasPriorData 
                    ? `${metrics.ratingsCount.percentChange >= 0 ? '↑' : '↓'} ${Math.abs(metrics.ratingsCount.percentChange).toFixed(1)}%`
                    : '% --'
                  }
                </Text>
              </View>
            </View>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValue}>{metrics.ratingsCount.value.toLocaleString()}</Text>
              <Text style={styles.metricDelta}>
                {metrics.ratingsCount.hasPriorData ? (
                  <>
                    <Text style={[
                      styles.deltaNumber,
                      metrics.ratingsCount.change >= 0 ? styles.deltaGreen : styles.deltaRed
                    ]}>
                      {metrics.ratingsCount.change >= 0 ? '+' : ''}{metrics.ratingsCount.change}
                    </Text>
                    {' over prior '}{metrics.ratingsCount.priorPeriod}
                  </>
                ) : (
                  '+0 over prior period'
                )}
              </Text>
            </View>
          </View>
          
          {/* Avg. Rating */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricName}>Avg. Rating</Text>
              <View style={[
                styles.trendBadge, 
                metrics.avgRating.hasPriorData
                  ? (metrics.avgRating.percentChange >= 0 ? styles.trendBadgeGreen : styles.trendBadgeRed)
                  : styles.trendBadgeGrey
              ]}>
                <Text>
                  {metrics.avgRating.hasPriorData 
                    ? `${metrics.avgRating.percentChange >= 0 ? '↑' : '↓'} ${Math.abs(metrics.avgRating.percentChange).toFixed(1)}%`
                    : '% --'
                  }
                </Text>
              </View>
            </View>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValue}>{metrics.avgRating.value.toFixed(2)}</Text>
              <Text style={styles.metricDelta}>
                {metrics.avgRating.hasPriorData ? (
                  <>
                    <Text style={[
                      styles.deltaNumber,
                      metrics.avgRating.change >= 0 ? styles.deltaGreen : styles.deltaRed
                    ]}>
                      {metrics.avgRating.change >= 0 ? '+' : ''}{metrics.avgRating.change.toFixed(2)}
                    </Text>
                    {' over prior '}{metrics.avgRating.priorPeriod}
                  </>
                ) : (
                  '+0.00 over prior period'
                )}
              </Text>
            </View>
          </View>
          
          {/* Ratings per Day */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricName}>Ratings per Day</Text>
              <View style={[
                styles.trendBadge, 
                metrics.ratingsPerDay.hasPriorData
                  ? (metrics.ratingsPerDay.percentChange >= 0 ? styles.trendBadgeGreen : styles.trendBadgeRed)
                  : styles.trendBadgeGrey
              ]}>
                <Text>
                  {metrics.ratingsPerDay.hasPriorData 
                    ? `${metrics.ratingsPerDay.percentChange >= 0 ? '↑' : '↓'} ${Math.abs(metrics.ratingsPerDay.percentChange).toFixed(1)}%`
                    : '% --'
                  }
                </Text>
              </View>
            </View>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValue}>{metrics.ratingsPerDay.value.toFixed(1)}</Text>
              <Text style={styles.metricDelta}>
                {metrics.ratingsPerDay.hasPriorData ? (
                  <>
                    <Text style={[
                      styles.deltaNumber,
                      metrics.ratingsPerDay.change >= 0 ? styles.deltaGreen : styles.deltaRed
                    ]}>
                      {metrics.ratingsPerDay.change >= 0 ? '+' : ''}{metrics.ratingsPerDay.change.toFixed(1)}
                    </Text>
                    {' over prior '}{metrics.ratingsPerDay.priorPeriod}
                  </>
                ) : (
                  '+0.0 over prior period'
                )}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDate]}>Date</Text>
            <Text style={[styles.tableHeaderCell, styles.colEmployee]}>Employee</Text>
            <Text style={[styles.tableHeaderCell, styles.colRole]}>Employee Role</Text>
            <Text style={[styles.tableHeaderCell, styles.colLeader]}>Leader</Text>
            <Text style={[styles.tableHeaderCell, styles.colPosition]}>Position</Text>
            <Text style={[styles.tableHeaderCell, styles.colRating]}>Criteria 1</Text>
            <Text style={[styles.tableHeaderCell, styles.colRating]}>Criteria 2</Text>
            <Text style={[styles.tableHeaderCell, styles.colRating]}>Criteria 3</Text>
            <Text style={[styles.tableHeaderCell, styles.colRating]}>Criteria 4</Text>
            <Text style={[styles.tableHeaderCell, styles.colRating]}>Criteria 5</Text>
            <Text style={[styles.tableHeaderCell, styles.colOverall]}>Overall</Text>
          </View>
          
          {/* Table Rows */}
          {tableData.map((row, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tableCell, styles.colDate]}>{row.date}</Text>
              <View style={[styles.tableCell, styles.colEmployee, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }]}>
                <Text>{row.employeeName}</Text>
                {row.locationNumber && (
                  <Text style={styles.locationTag}>{row.locationNumber}</Text>
                )}
              </View>
              <View style={[styles.tableCell, styles.colRole, styles.pillWrapper]}>
                <View style={getRolePillStyle(row.employeeRole)}>
                  <Text>{row.employeeRole}</Text>
                </View>
              </View>
              <Text style={[styles.tableCell, styles.colLeader]}>{row.leaderName}</Text>
              <View style={[styles.tableCell, styles.colPosition, styles.pillWrapper]}>
                <View style={[styles.pill, row.isFOH ? styles.fohPill : styles.bohPill]}>
                  <Text>{row.position}</Text>
                </View>
              </View>
              <View style={[styles.tableCell, styles.colRating]}>
                {row.rating1 !== null && (
                  <View style={[styles.ratingCell, getRatingStyle(row.rating1)]}>
                    <Text>{row.rating1.toFixed(2)}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.tableCell, styles.colRating]}>
                {row.rating2 !== null && (
                  <View style={[styles.ratingCell, getRatingStyle(row.rating2)]}>
                    <Text>{row.rating2.toFixed(2)}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.tableCell, styles.colRating]}>
                {row.rating3 !== null && (
                  <View style={[styles.ratingCell, getRatingStyle(row.rating3)]}>
                    <Text>{row.rating3.toFixed(2)}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.tableCell, styles.colRating]}>
                {row.rating4 !== null && (
                  <View style={[styles.ratingCell, getRatingStyle(row.rating4)]}>
                    <Text>{row.rating4.toFixed(2)}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.tableCell, styles.colRating]}>
                {row.rating5 !== null && (
                  <View style={[styles.ratingCell, getRatingStyle(row.rating5)]}>
                    <Text>{row.rating5.toFixed(2)}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.tableCell, styles.colOverall]}>
                {row.overall !== null && (
                  <View style={[styles.ratingCell, getRatingStyle(row.overall)]}>
                    <Text>{row.overall.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
        
        {/* Footer with Logo and Page Numbers */}
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

export default PositionalRatingsPDF;

