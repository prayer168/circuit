# 電路物理互動稽核報告

- 稽核時間：2026-07-14T00:15:32.826Z
- 結果：通過
- 通過／失敗：22／0

| 檢查項目 | 結果 | 說明 |
|---|---:|---|
| 資料載入 | 通過 | 生活應用與資源已載入 |
| 教材結構 | 通過 | {"tabs":7,"apps":6,"resources":8,"duplicateIds":[]} |
| SVG／DOM ID 唯一 | 通過 | 無重複 ID |
| 完整通路開關 | 通過 | {"on":"true","label":"開關閉合，形成完整通路，燈泡發亮","contained":true} |
| 接法：bulb-series | 通過 | {"mode":"bulb-series","visible":1,"title":"兩顆燈泡共用一條通路","feedback":"兩顆都熄滅：拿掉一顆燈泡後，唯一的通路被切斷。","ok":true} |
| 接法：bulb-parallel | 通過 | {"mode":"bulb-parallel","visible":1,"title":"兩顆燈泡分別接在兩條支路","feedback":"第 1 顆仍亮：第 2 支路中斷，但第 1 支路仍是完整通路。","ok":true} |
| 接法：battery-series | 通過 | {"mode":"battery-series","visible":1,"title":"第 1 顆正極接第 2 顆負極","feedback":"燈泡熄滅：拿掉一顆電池後，串聯的唯一通路被切斷。","ok":true} |
| 接法：battery-parallel | 通過 | {"mode":"battery-parallel","visible":1,"title":"正極接正極，負極接負極","feedback":"燈泡仍亮：拿掉一顆後，另一顆仍形成通路，但可使用的時間會縮短。","ok":true} |
| 實驗接法即時同步 | 通過 | {"parallelClass":true,"diagramVisible":true,"prompt":"先做預測：目前是燈泡並聯。觀察接線後選擇預測，再按「驗證結果」。","ok":true} |
| 並聯支路接到燈泡端點 | 通過 | [{"name":"one","leftGap":1.00384521484375,"rightGap":1.00384521484375,"ok":true},{"name":"two","leftGap":1.00384521484375,"rightGap":1.00384521484375,"ok":true}] |
| 故障規則：series-normal | 通過 | {"id":"series-normal","mode":"series","fault":false,"prediction":"both-on","labelIncludes":"串聯且正常發亮","feedbackIncludes":"兩顆都亮","label":"兩顆燈泡串聯且正常發亮","feedback":"觀察結果：兩顆都亮。它們共用一條路。","ok":true} |
| 故障規則：series-fault | 通過 | {"id":"series-fault","mode":"series","fault":true,"prediction":"both-off","labelIncludes":"兩顆燈泡都不亮","feedbackIncludes":"唯一通路被故障處切斷","label":"第 2 顆燈泡故障，串聯的兩顆燈泡都不亮","feedback":"預測成功！串聯的唯一通路被故障處切斷，兩顆都不亮。","ok":true} |
| 故障規則：parallel-fault | 通過 | {"id":"parallel-fault","mode":"parallel","fault":true,"prediction":"one-on","labelIncludes":"第 1 顆仍亮","feedbackIncludes":"第 1 條支路仍完整","label":"第 2 顆燈泡故障，並聯的第 1 顆仍亮","feedback":"預測成功！並聯的第 1 條支路仍完整，所以第 1 顆繼續亮。","ok":true} |
| 生活應用觀察證據 | 通過 | [{"answerVisible":true,"evidenceVisible":true},{"answerVisible":true,"evidenceVisible":true},{"answerVisible":true,"evidenceVisible":true},{"answerVisible":true,"evidenceVisible":true},{"answerVisible":true,"evidenceVisible":true},{"answerVisible":true,"evidenceVisible":true}] |
| 題庫邊界與答案分布 | 通過 | 10 題；答案位置 0, 1, 2, 3 |
| 響應式：desktop | 通過 | [{"tab":"mission","width":1440,"innerWidth":1440},{"tab":"light","width":1425,"innerWidth":1440},{"tab":"connections","width":1425,"innerWidth":1440},{"tab":"lab","width":1425,"innerWidth":1440},{"tab":"life","width":1425,"innerWidth":1440},{"tab":"quiz","width":1425,"innerWidth":1440},{"tab":"resources","width":1425,"innerWidth":1440}] |
| 響應式：tablet | 通過 | [{"tab":"mission","width":753,"innerWidth":768},{"tab":"light","width":753,"innerWidth":768},{"tab":"connections","width":753,"innerWidth":768},{"tab":"lab","width":753,"innerWidth":768},{"tab":"life","width":753,"innerWidth":768},{"tab":"quiz","width":768,"innerWidth":768},{"tab":"resources","width":753,"innerWidth":768}] |
| 響應式：mobile | 通過 | [{"tab":"mission","width":375,"innerWidth":390},{"tab":"light","width":375,"innerWidth":390},{"tab":"connections","width":375,"innerWidth":390},{"tab":"lab","width":375,"innerWidth":390},{"tab":"life","width":375,"innerWidth":390},{"tab":"quiz","width":375,"innerWidth":390},{"tab":"resources","width":375,"innerWidth":390}] |
| 降低動畫偏好 | 通過 | {"paused":true,"status":"步驟 4／4：共同兩端接入燈泡電路（已依降低動畫偏好顯示完成狀態）"} |
| 隱藏頁籤停止動畫 | 通過 | {"paused":true,"playing":"false"} |
| 瀏覽器主控台 | 通過 | 無錯誤 |
| 關鍵請求 | 通過 | 無 4xx／5xx |

## 重跑指令

```powershell
node .\scripts\audit-circuit.mjs --project . --config .\physics-audit.json --output .\audit\physics-audit-report.json --markdown .\audit\physics-audit-report.md
```
