"use client";

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { cvStyles } from "./styles";
import { formatDate, cleanLineBreakHyphens } from "./utils";
import type { CvData } from "@/types";

// プロジェクトが空かどうかをチェック
function isEmptyWork(work: { startYear?: string; startMonth?: string; period?: string; freeformContent?: string; content?: string }) {
  const hasDate = (work.startYear && work.startMonth) || work.period;
  const hasContent = work.freeformContent || work.content;
  return !hasDate && !hasContent;
}

// フォント登録
import "./fonts";

interface CvFreePDFProps {
  data: CvData;
}

/**
 * 職務経歴書PDF（自由記述Ver）コンポーネント
 * 業務内容・成果・取り組みをフリーテキストで表示
 */
export function CvFreePDF({ data }: CvFreePDFProps) {
  return (
    <Document>
      <Page size="A4" style={cvStyles.page}>
        {/* タイトル */}
        <Text style={cvStyles.title}>職 務 経 歴 書</Text>

        {/* 日付・氏名（2行） */}
        <View style={cvStyles.headerContainer}>
          <Text style={cvStyles.headerDate}>{formatDate(data.createdDate)}</Text>
          <Text style={cvStyles.headerName}>氏名：{data.name || ""}</Text>
        </View>

        {/* 職務要約 */}
        {data.summary && (
          <View>
            <Text style={cvStyles.sectionTitle}>■職務要約</Text>
            <Text style={cvStyles.summaryText}>{data.summary}</Text>
          </View>
        )}

        {/* 職務経歴 */}
        <Text style={cvStyles.sectionTitle}>■職務経歴</Text>

        {(data.workHistory || []).map((work, i) => {
          // 在籍期間を生成
          const companyPeriod = (() => {
            if (work.startYear && work.startMonth) {
              const startPart = `${work.startYear}年${work.startMonth}月`;
              const endPart = work.isCurrentJob
                ? "現在"
                : (work.endYear && work.endMonth ? `${work.endYear}年${work.endMonth}月` : "");
              return endPart ? `${startPart}〜${endPart}` : startPart;
            }
            return work.period || "";
          })();

          // 空でない項目だけ表示
          const hasBusinessContent = !!work.businessContent;
          const hasEstablished = !!work.established;
          const hasCapital = !!work.capital;
          const hasEmployees = !!work.employees;

          const secondLineItems: string[] = [];
          if (hasEstablished) secondLineItems.push(`設立：${work.established}`);
          if (hasCapital) secondLineItems.push(`資本金：${work.capital}`);
          if (hasEmployees) secondLineItems.push(`従業員数：${work.employees}`);
          const secondLine = secondLineItems.join("　");

          return (
          <View key={`cv-free-work-${i}`} style={cvStyles.companySection}>
            {/* 会社名と在籍期間を横並び */}
            <View style={cvStyles.companyNameContainer}>
              <Text style={cvStyles.companyName}>○{work.companyName || ""}</Text>
              {companyPeriod && (
                <Text style={cvStyles.companyPeriod}>{companyPeriod}</Text>
              )}
            </View>

            {/* 会社情報（空でない項目のみ表示） */}
            <View style={cvStyles.companyInfoContainer}>
              {hasBusinessContent && (
                <Text style={cvStyles.companyInfo}>
                  ◆事業内容：{work.businessContent}
                </Text>
              )}
              {secondLine && (
                <Text style={cvStyles.companyInfo}>
                  ◆{secondLine}
                </Text>
              )}
            </View>

            {/* 期間・業務内容テーブル */}
            <View style={cvStyles.workTable}>
              {/* ヘッダー */}
              <View style={cvStyles.workTableHeader}>
                <View style={cvStyles.workPeriodHeader}>
                  <Text style={cvStyles.workHeaderText}>期間</Text>
                </View>
                <View style={cvStyles.workContentHeader}>
                  <Text style={cvStyles.workHeaderText}>業務内容</Text>
                </View>
              </View>

              {/* 内容 */}
              <View style={cvStyles.workTableRow} minPresenceAhead={200}>
                <View style={cvStyles.workPeriodCell}>
                  {/* 期間を改行で表示（新形式）または1行（旧形式） */}
                  {work.startYear && work.startMonth ? (
                    <Text style={cvStyles.workPeriodText}>
                      {`${work.startYear}年${work.startMonth}月\n〜\n${work.isCurrentJob ? "現在" : (work.endYear && work.endMonth ? `${work.endYear}年${work.endMonth}月` : "")}`}
                    </Text>
                  ) : (
                    <Text style={cvStyles.workPeriodText}>{work.period || ""}</Text>
                  )}
                </View>
                <View style={cvStyles.workContentCell}>
                  {/* 自由記述フィールドの内容を表示 */}
                  {work.freeformContent ? (
                    <Text style={cvStyles.freeformText}>{cleanLineBreakHyphens(work.freeformContent)}</Text>
                  ) : (
                    /* フォールバック: 通常フィールドがあれば表示 */
                    <>
                      {work.content && (
                        <View>
                          <Text style={cvStyles.workSubTitleFirst}>【業務内容】</Text>
                          <Text style={cvStyles.freeformText}>{cleanLineBreakHyphens(work.content)}</Text>
                        </View>
                      )}
                      {work.achievements && (
                        <View>
                          <Text style={cvStyles.workSubTitle}>【成果】</Text>
                          <Text style={cvStyles.freeformText}>{cleanLineBreakHyphens(work.achievements)}</Text>
                        </View>
                      )}
                      {work.initiatives && (
                        <View>
                          <Text style={cvStyles.workSubTitle}>【取り組みと成果】</Text>
                          <Text style={cvStyles.freeformText}>{cleanLineBreakHyphens(work.initiatives)}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>
          );
        })}

        {/* 活かせる経験・知識・技術（自由記述） */}
        {(data.freeformSkills || (data.skills || []).length > 0) && (
          <View>
            <Text style={cvStyles.sectionTitle}>■活かせる経験・知識・技術</Text>
            {data.freeformSkills ? (
              <Text style={cvStyles.freeformText}>{cleanLineBreakHyphens(data.freeformSkills)}</Text>
            ) : (
              /* フォールバック: 通常のスキルリスト */
              data.skills?.map((skill, i) => (
                <Text key={`skill-${i}`} style={cvStyles.skillItem}>
                  ・{skill}
                </Text>
              ))
            )}
          </View>
        )}

        {/* 自己PR */}
        {(data.selfPrTitle || data.selfPr) && (
          <View>
            <Text style={cvStyles.sectionTitle}>■自己PR</Text>
            {data.selfPrTitle && (
              <Text style={cvStyles.selfPrTitle}>【{data.selfPrTitle}】</Text>
            )}
            {data.selfPr && <Text style={cvStyles.selfPrText}>{data.selfPr}</Text>}
          </View>
        )}
      </Page>
    </Document>
  );
}

