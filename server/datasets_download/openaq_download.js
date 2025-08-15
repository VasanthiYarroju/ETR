import axios from "axios";
import {Parser} from "json2csv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = "https://api.openaq.org/v1/measurements";

const params={
    parameter:"pm25",
    country: ["FR", "DE", "IT", "ES"],    // European countries
    date_from: "2024-01-01T00:00:00Z",
    date_to: "2024-12-31T23:59:59Z",
    limit: 10000,
    page: 1,
    sort: "desc"
}

async function fetchAllData(){
    let allData=[];
    let page=1;
    while(true){
        console.log(`Fetching page ${page} ...`);
        params.page = page;
        try{
            const response=await axios.get(url,{params});
            const results=response.data.results;
            if(results.length==0){
                break;
            }
            allData=allData.concat(results);
            page++;
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
        }
        catch(err){
            console.error("Error fetching data:",err.message);
            break;
        }
    }
    console.log(`Total records fetched: ${allData.length}`);
    return allData;
}

async function savetoCSV(data){
    const parser=new Parser();
    const csv=parser.parse(data);
    const filePath=path.join(__dirname, "air_quality.csv");
    fs.writeFileSync(filePath, csv);
    console.log(`Data saved to ${filePath}`);
}

async function main(){
    const data=await fetchAllData();
    await savetoCSV(data);
}
main();