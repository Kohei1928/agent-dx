"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// フォント登録
import "./fonts";

// スタイル定義
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "NotoSansJP",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 3,
    borderBottomColor: "#f97316",
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  metaItem: {
    fontSize: 10,
    color: "#64748b",
  },
  noteSection: {
    backgroundColor: "#fff7ed",
    padding: 15,
    borderRadius: 8,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: "#f97316",
  },
  noteLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#ea580c",
    marginBottom: 5,
  },
  noteText: {
    fontSize: 10,
    color: "#1e293b",
    lineHeight: 1.6,
  },
  jobCard: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  jobHeader: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
  },
  jobNumber: {
    width: 28,
    height: 28,
    backgroundColor: "#f97316",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  jobNumberText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ffffff",
  },
  jobTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
  },
  jobCompany: {
    fontSize: 10,
    color: "#64748b",
  },
  jobBody: {
    padding: 12,
  },
  jobInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  jobInfoItem: {
    width: "50%",
    marginBottom: 6,
  },
  jobInfoLabel: {
    fontSize: 8,
    color: "#94a3b8",
    marginBottom: 2,
  },
  jobInfoValue: {
    fontSize: 10,
    color: "#1e293b",
  },
  recommendSection: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
  },
  recommendLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#d97706",
    marginBottom: 4,
  },
  recommendText: {
    fontSize: 10,
    color: "#1e293b",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  pageNumber: {
    position: "absolute",
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
  },
});

interface ProposalItem {
  id: string;
  order: number;
  recommend: string | null;
  job: {
    id: string;
    title: string;
    category: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    employmentType: string | null;
    remoteWork: string | null;
    requirements: string | null;
    company: {
      name: string;
      industry: string | null;
    };
  };
}

interface ProposalData {
  id: string;
  title: string | null;
  note: string | null;
  createdByName: string;
  createdAt: string;
  jobSeeker: {
    name: string;
    email: string | null;
  };
  items: ProposalItem[];
}

interface ProposalPDFProps {
  data: ProposalData;
}

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return "-";
  if (min && max) return `${min}〜${max}万円`;
  if (min) return `${min}万円〜`;
  if (max) return `〜${max}万円`;
  return "-";
}

function formatRemoteWork(remote: string | null): string {
  if (!remote) return "-";
  switch (remote) {
    case "full":
      return "フルリモート可";
    case "partial":
      return "一部リモート可";
    case "none":
      return "出社必須";
    default:
      return remote;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function ProposalPDF({ data }: ProposalPDFProps) {
  const itemsPerPage = 3;
  const pages: ProposalItem[][] = [];
  
  for (let i = 0; i < data.items.length; i += itemsPerPage) {
    pages.push(data.items.slice(i, i + itemsPerPage));
  }

  return (
    <Document>
      {pages.map((pageItems, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* ヘッダー（1ページ目のみフル表示） */}
          {pageIndex === 0 && (
            <>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  {data.title || "求人提案書"}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {data.jobSeeker.name} 様
                </Text>
              </View>

              <View style={styles.meta}>
                <Text style={styles.metaItem}>
                  作成日：{formatDate(data.createdAt)}
                </Text>
                <Text style={styles.metaItem}>
                  担当：{data.createdByName}
                </Text>
              </View>

              {data.note && (
                <View style={styles.noteSection}>
                  <Text style={styles.noteLabel}>担当者からのメッセージ</Text>
                  <Text style={styles.noteText}>{data.note}</Text>
                </View>
              )}
            </>
          )}

          {/* 求人カード */}
          {pageItems.map((item) => (
            <View key={item.id} style={styles.jobCard} wrap={false}>
              <View style={styles.jobHeader}>
                <View style={styles.jobNumber}>
                  <Text style={styles.jobNumberText}>{item.order + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobTitle}>{item.job.title}</Text>
                  <Text style={styles.jobCompany}>{item.job.company.name}</Text>
                </View>
              </View>
              <View style={styles.jobBody}>
                <View style={styles.jobInfo}>
                  <View style={styles.jobInfoItem}>
                    <Text style={styles.jobInfoLabel}>年収</Text>
                    <Text style={styles.jobInfoValue}>
                      {formatSalary(item.job.salaryMin, item.job.salaryMax)}
                    </Text>
                  </View>
                  <View style={styles.jobInfoItem}>
                    <Text style={styles.jobInfoLabel}>雇用形態</Text>
                    <Text style={styles.jobInfoValue}>
                      {item.job.employmentType || "-"}
                    </Text>
                  </View>
                  <View style={styles.jobInfoItem}>
                    <Text style={styles.jobInfoLabel}>職種</Text>
                    <Text style={styles.jobInfoValue}>
                      {item.job.category || "-"}
                    </Text>
                  </View>
                  <View style={styles.jobInfoItem}>
                    <Text style={styles.jobInfoLabel}>リモート</Text>
                    <Text style={styles.jobInfoValue}>
                      {formatRemoteWork(item.job.remoteWork)}
                    </Text>
                  </View>
                </View>
                {item.recommend && (
                  <View style={styles.recommendSection}>
                    <Text style={styles.recommendLabel}>★ おすすめポイント</Text>
                    <Text style={styles.recommendText}>{item.recommend}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* フッター */}
          <View style={styles.footer}>
            <Text>株式会社ミギナナメウエ</Text>
          </View>
          <Text style={styles.pageNumber}>
            {pageIndex + 1} / {pages.length}
          </Text>
        </Page>
      ))}
    </Document>
  );
}


