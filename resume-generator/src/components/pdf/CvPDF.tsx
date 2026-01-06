"use client";

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { cvStyles } from "./styles";
import { formatDate, parseBullets, parseMultilineWithBold, parseBulletsWithBold, cleanLineBreakHyphens } from "./utils";
import type { CvData } from "@/types";

// プロジェクトが空かどうかをチェック
function isEmptyProject(project: { startYear?: string; startMonth?: string; content?: string; achievements?: string; initiatives?: string }) {
  const hasDate = project.startYear && project.startMonth;
  const hasContent = project.content || project.achievements || project.initiatives;
  return !hasDate && !hasContent;
}

// フォント登録
import "./fonts";

interface CvPDFProps {
  data: CvData;
}

/**
 * 職務経歴書PDFコンポーネント
 */
export function CvPDF({ data }: CvPDFProps) {
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

        {/* 職務要約（太字対応） */}
        {data.summary && (
          <View>
            <Text style={cvStyles.sectionTitle}>■職務要約</Text>
            <View>
              {parseMultilineWithBold(data.summary).map((lineSegments, i) => (
                <View key={`summary-line-${i}`} style={cvStyles.freeTextLine}>
                  {lineSegments.map((segment, j) => (
                    <Text
                      key={`summary-seg-${i}-${j}`}
                      style={segment.bold ? cvStyles.freeTextBold : cvStyles.freeTextNormal}
                    >
                      {segment.text}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
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

          // 空でない項目だけを表示するためのヘルパー
          const hasBusinessContent = !!work.businessContent;
          const hasEstablished = !!work.established;
          const hasCapital = !!work.capital;
          const hasEmployees = !!work.employees;

          // 第2行（設立・資本金・従業員数）の内容を動的に生成
          const secondLineItems: string[] = [];
          if (hasEstablished) secondLineItems.push(`設立：${work.established}`);
          if (hasCapital) secondLineItems.push(`資本金：${work.capital}`);
          if (hasEmployees) secondLineItems.push(`従業員数：${work.employees}`);
          const secondLine = secondLineItems.join("　");

          return (
          <View key={`cv-work-${i}`} style={cvStyles.companySection}>
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

              {/* 業務セットがある場合はprojectsを使用、ない場合は後方互換性のため従来の形式を使用 */}
              {(work.projects && work.projects.length > 0) ? (
                work.projects
                  .filter(project => !isEmptyProject(project))  // 空のプロジェクトを除外
                  .map((project, pIdx) => (
                  <View key={`project-${pIdx}`} wrap={false}>
                    {/* 2つ目以降の業務セットの前に区切り線を追加 */}
                    {pIdx > 0 && <View style={cvStyles.projectDivider} />}
                    <View style={cvStyles.workTableRow}>
                      <View style={cvStyles.workPeriodCell}>
                        {project.startYear && project.startMonth ? (
                          <Text style={cvStyles.workPeriodText}>
                            {`${project.startYear}年${project.startMonth}月\n〜\n${project.isCurrentJob ? "現在" : (project.endYear && project.endMonth ? `${project.endYear}年${project.endMonth}月` : "")}`}
                          </Text>
                        ) : null}
                      </View>
                      <View style={cvStyles.workContentCell}>
                        {/* 業務内容（太字対応） */}
                        {project.content && (
                          <View>
                            <Text style={cvStyles.workSubTitleFirst}>【業務内容】</Text>
                            {parseBulletsWithBold(project.content).map((item, j) => (
                              <View key={`content-${j}`} style={cvStyles.workBulletLine}>
                                <Text style={cvStyles.workBulletPrefix}>・</Text>
                                <View style={cvStyles.workBulletTextContainer}>
                                  {item.segments.map((seg, k) => (
                                    <Text
                                      key={`content-seg-${j}-${k}`}
                                      style={seg.bold ? cvStyles.workBulletBold : cvStyles.workBulletNormal}
                                    >
                                      {seg.text}
                                    </Text>
                                  ))}
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* 成果（太字対応） */}
                        {project.achievements && (
                          <View>
                            <Text style={cvStyles.workSubTitle}>【成果】</Text>
                            {parseBulletsWithBold(project.achievements).map((item, j) => (
                              <View key={`achievement-${j}`} style={cvStyles.workBulletLine}>
                                <Text style={cvStyles.workBulletPrefix}>・</Text>
                                <View style={cvStyles.workBulletTextContainer}>
                                  {item.segments.map((seg, k) => (
                                    <Text
                                      key={`achievement-seg-${j}-${k}`}
                                      style={seg.bold ? cvStyles.workBulletBold : cvStyles.workBulletNormal}
                                    >
                                      {seg.text}
                                    </Text>
                                  ))}
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* 取り組み（太字対応） */}
                        {project.initiatives && (
                          <View>
                            <Text style={cvStyles.workSubTitle}>【取り組みと成果】</Text>
                            {parseBulletsWithBold(project.initiatives).map((item, j) => (
                              <View key={`initiative-${j}`} style={cvStyles.workBulletLine}>
                                <Text style={cvStyles.workBulletPrefix}>・</Text>
                                <View style={cvStyles.workBulletTextContainer}>
                                  {item.segments.map((seg, k) => (
                                    <Text
                                      key={`initiative-seg-${j}-${k}`}
                                      style={seg.bold ? cvStyles.workBulletBold : cvStyles.workBulletNormal}
                                    >
                                      {seg.text}
                                    </Text>
                                  ))}
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                /* 後方互換性: projectsがない場合は従来の形式を使用 */
                <View style={cvStyles.workTableRow} wrap={false}>
                  <View style={cvStyles.workPeriodCell}>
                    {work.startYear && work.startMonth ? (
                      <Text style={cvStyles.workPeriodText}>
                        {`${work.startYear}年${work.startMonth}月\n〜\n${work.isCurrentJob ? "現在" : (work.endYear && work.endMonth ? `${work.endYear}年${work.endMonth}月` : "")}`}
                      </Text>
                    ) : work.period ? (
                      <Text style={cvStyles.workPeriodText}>{work.period}</Text>
                    ) : null}
                  </View>
                  <View style={cvStyles.workContentCell}>
                    {/* 業務内容（太字対応） */}
                    {work.content && (
                      <View>
                        <Text style={cvStyles.workSubTitleFirst}>【業務内容】</Text>
                        {parseBulletsWithBold(work.content).map((item, j) => (
                          <View key={`content-${j}`} style={cvStyles.workBulletLine}>
                            <Text style={cvStyles.workBulletPrefix}>・</Text>
                            <View style={cvStyles.workBulletTextContainer}>
                              {item.segments.map((seg, k) => (
                                <Text
                                  key={`content-seg-${j}-${k}`}
                                  style={seg.bold ? cvStyles.workBulletBold : cvStyles.workBulletNormal}
                                >
                                  {seg.text}
                                </Text>
                              ))}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* 成果（太字対応） */}
                    {work.achievements && (
                      <View>
                        <Text style={cvStyles.workSubTitle}>【成果】</Text>
                        {parseBulletsWithBold(work.achievements).map((item, j) => (
                          <View key={`achievement-${j}`} style={cvStyles.workBulletLine}>
                            <Text style={cvStyles.workBulletPrefix}>・</Text>
                            <View style={cvStyles.workBulletTextContainer}>
                              {item.segments.map((seg, k) => (
                                <Text
                                  key={`achievement-seg-${j}-${k}`}
                                  style={seg.bold ? cvStyles.workBulletBold : cvStyles.workBulletNormal}
                                >
                                  {seg.text}
                                </Text>
                              ))}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* 取り組み（太字対応） */}
                    {work.initiatives && (
                      <View>
                        <Text style={cvStyles.workSubTitle}>【取り組みと成果】</Text>
                        {parseBulletsWithBold(work.initiatives).map((item, j) => (
                          <View key={`initiative-${j}`} style={cvStyles.workBulletLine}>
                            <Text style={cvStyles.workBulletPrefix}>・</Text>
                            <View style={cvStyles.workBulletTextContainer}>
                              {item.segments.map((seg, k) => (
                                <Text
                                  key={`initiative-seg-${j}-${k}`}
                                  style={seg.bold ? cvStyles.workBulletBold : cvStyles.workBulletNormal}
                                >
                                  {seg.text}
                                </Text>
                              ))}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        );
        })}

        {/* 活かせる経験・知識・技術（フリーテキスト優先） */}
        {(data.skillsText || (data.skills || []).length > 0) && (
          <View>
            <Text style={cvStyles.sectionTitle}>■活かせる経験・知識・技術</Text>
            {data.skillsText ? (
              // フリーテキスト形式（太字対応）
              parseMultilineWithBold(data.skillsText).map((lineSegments, i) => (
                <View key={`skills-line-${i}`} style={cvStyles.freeTextLine}>
                  {lineSegments.map((segment, j) => (
                    <Text
                      key={`skills-seg-${i}-${j}`}
                      style={segment.bold ? cvStyles.freeTextBold : cvStyles.freeTextNormal}
                    >
                      {segment.text}
                    </Text>
                  ))}
                </View>
              ))
            ) : (
              // 後方互換性: 配列形式
              data.skills.map((skill, i) => (
                <Text key={`skill-${i}`} style={cvStyles.skillItem}>
                  ・{skill}
                </Text>
              ))
            )}
          </View>
        )}

        {/* 自己PR（太字対応） */}
        {(data.selfPrTitle || data.selfPr) && (
          <View>
            <Text style={cvStyles.sectionTitle}>■自己PR</Text>
            {data.selfPrTitle && (
              <Text style={cvStyles.selfPrTitle}>【{data.selfPrTitle}】</Text>
            )}
            {data.selfPr && (
              <View>
                {parseMultilineWithBold(data.selfPr).map((lineSegments, i) => (
                  <View key={`selfpr-line-${i}`} style={cvStyles.freeTextLine}>
                    {lineSegments.map((segment, j) => (
                      <Text
                        key={`selfpr-seg-${i}-${j}`}
                        style={segment.bold ? cvStyles.freeTextBold : cvStyles.freeTextNormal}
                      >
                        {segment.text}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}

