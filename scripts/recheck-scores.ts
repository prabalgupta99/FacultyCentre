
import { JSDOM } from 'jsdom';
import { analyzeCareerPage } from './logic-node.js';

const TARGET_COLLEGES = [
    { name: "School of Legal Studies, Kochi, Kerala", url: "https://recruit.cusat.ac.in/notifications.php" },
    { name: "School Of Law, G.D. Goenka University, Gurgaon", url: "https://www.gdgoenkauniversity.com/career" },
    { name: "Law School, Northcap University, Gurgaon", url: "https://www.ncuindia.edu/careers/" },
    { name: "School of Law, Justice & Goverance, Gautam Buddha University, Greater Noida", url: "https://www.gbu.ac.in/page/recruitment" },
    { name: "Fairfield Institute of Management Fall 2025-2026 GSOLand Technology, Delhi", url: "https://fimt-ggsipu.org/career.php" },
    { name: "Faculty of Law, Icfai University", url: "https://www.iudehradun.edu.in/careers" },
    { name: "School of Juridical Sciences,", url: "https://www.jisuniversity.ac.in/career/" },
    { name: "School of Legal studies, Gyanveer University", url: "https://www.gyanveeruniversity.edu.in/Pages/advertisement_steps.aspx" },
    { name: "Trinity Institute of Professional Studies, Dwarka,", url: "https://www.tips.edu.in/aboutus/career_at_tips" },
    { name: "Trinity Institute of Innovations in Professional Studies, Greater Noida", url: "https://www.tiips.ac.in/career/jobapplication" },
    { name: "IIMT College of Law, Greater Noida", url: "https://www.iimtindia.net/work-with-us.php" },
    { name: "School of Law, K.R. Mangalam University, Gurgaon", url: "https://www.krmangalam.edu.in/careers/" },
    { name: "Chanderprabhu Jain College of Higher Studies, Narela, Delhi", url: "https://www.cpj.edu.in/career/" },
    { name: "Gitarattan International Business School, Madhuban Chowk, Rohini, Delhi", url: "https://gitarattan.edu.in/career/" },
    { name: "Balaji School of Law", url: "https://www.sbup.edu.in/careers" },
    { name: "Faculty of Law, HRIT University, Ghaziabad, Uttar Pradesh", url: "https://hrituniversity.edu.in/career" },
    { name: "School of Law, Starex University, Gurgaon", url: "https://www.starexuniversity.com/career" },
    { name: "Delhi Global Institute of Management, Faridabad", url: "https://dgimfaridabad.com/career" },
    { name: "Faculty of Law, Jamia Millia Islamia, Jamia Nagar, Delhi", url: "https://jmi.ac.in/BULLETIN-BOARD/Jobs/Careers@JMI" },
    { name: "Maharana Pratap College of Law,", url: "https://www.pratapuniversity.in/forms?enc=EfHLwTpT949Nj4bDX2qrKw%3D%3D" },
    { name: "School of Law, Bennett University, Greater Noida", url: "https://www.bennett.edu.in/career" },
    { name: "East West College of Law,", url: "https://ewit.edu.in/careers/" },
    { name: "School of Law, Bharatiya Engineering Science and Technology Innovation University", url: "https://bestiu.edu.in/career" }
];

async function fetchHTMLWithRetry(url: string, retries = 3): Promise<string | null> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                },
                signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
                return await response.text();
            }
        } catch (error: any) {
        }

        if (i < retries - 1) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return null;
}

async function main() {
    console.log("Generating Markdown Report...");

    let markdownOutput = "# Logic v2 Impact Analysis (Threshold: 40)\n\n";
    markdownOutput += "| College Name | Previous Score | New Score | New Status (>=40) | Reason |\n";
    markdownOutput += "| :--- | :---: | :---: | :---: | :--- |\n";

    let passedCount = 0;
    let failedCount = 0;
    let errorCount = 0;

    for (const college of TARGET_COLLEGES) {
        const html = await fetchHTMLWithRetry(college.url);

        if (!html) {
            markdownOutput += `| ${college.name} | >= 25 | **ERR** | ❌ Error | Fetch Failed after 3 retries |\n`;
            errorCount++;
            continue;
        }

        const result = analyzeCareerPage(html);
        const score = result.confidence_score;
        const isHiring = score >= 40;

        const statusIcon = isHiring ? "✅ Hiring" : "⚠️ Dropped";
        if (isHiring) passedCount++; else failedCount++;

        // Truncate reason for display
        const reason = result.reason.replace(/Score \d+ [><]= threshold \(\d+\)\. Signals: /, "").substring(0, 150) + "...";
        // Clean up reason formatting
        const cleanReason = reason.replace(/\|/g, "-").replace(/\n/g, " ");

        markdownOutput += `| ${college.name} | >= 25 | **${score}** | ${statusIcon} | ${cleanReason} |\n`;

        await new Promise(r => setTimeout(r, 200));
    }

    markdownOutput += `\n\n### Summary\n`;
    markdownOutput += `- **Total Checked**: ${TARGET_COLLEGES.length}\n`;
    markdownOutput += `- **Still Hiring** (Score >= 40): ${passedCount} (${Math.round(passedCount / TARGET_COLLEGES.length * 100)}%)\n`;
    markdownOutput += `- **Dropped** (Score < 40): ${failedCount} (${Math.round(failedCount / TARGET_COLLEGES.length * 100)}%)\n`;
    markdownOutput += `- **Errors**: ${errorCount}\n`;

    console.log("MARKDOWN_START");
    console.log(markdownOutput);
    console.log("MARKDOWN_END");
}

main();
