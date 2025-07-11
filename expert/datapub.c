//+------------------------------------------------------------------+
//|                                           ProppingBoardEA.mq5    |
//|                      Copyright 2024, Gemini & Your Name          |
//|         (Data Collector for Multi-Source Comparison)             |
//+------------------------------------------------------------------+
#property copyright "Gemini & Your Name"
#property version   "2.0"
#property strict

//--- ورودی‌های اکسپرت (مهم‌ترین بخش برای تنظیم)
input string source_identifier  = "target_demo_alphaprop"; // شناسه منحصر به فرد این منبع داده (مثال: target_real_alphaprop, reference_lmax)
input string server_url_ticks = "http://127.0.0.1:5000/tick";
input string server_url_trades= "http://127.0.0.1:5000/trade";

//--- متغیرهای گلوبال
string g_broker_name;
long   g_account_number;
bool   g_is_demo_account;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    g_broker_name = AccountInfoString(ACCOUNT_COMPANY);
    g_account_number = AccountInfoInteger(ACCOUNT_LOGIN);
    g_is_demo_account = (AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_DEMO);
    
    PrintFormat("Propping Board EA Initialized. Source ID: '%s', Broker: '%s', Account: %d (%s)", 
                source_identifier, 
                g_broker_name, 
                g_account_number, 
                g_is_demo_account ? "Demo" : "Real");
                
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert tick function (ارسال قیمت لحظه‌ای)                        |
//+------------------------------------------------------------------+
void OnTick()
{
    MqlTick latest_tick;
    if(!SymbolInfoTick(_Symbol, latest_tick)) return;

    //--- ساخت پِی‌لود JSON با فیلدهای جدید
    string payload = StringFormat("{\"sourceIdentifier\":\"%s\", \"broker\":\"%s\", \"accountNumber\":%d, \"accountType\":\"%s\", \"symbol\":\"%s\", \"bid\":%.5f, \"ask\":%.5f, \"time_msc\":%llu}",
                                  source_identifier,
                                  g_broker_name,
                                  g_account_number,
                                  g_is_demo_account ? "Demo" : "Real",
                                  _Symbol,
                                  latest_tick.bid,
                                  latest_tick.ask,
                                  latest_tick.time_msc);

    SendData(server_url_ticks, payload);
}

// سایر توابع مانند OnTradeTransaction و SendData بدون تغییر باقی می‌مانند...

//+------------------------------------------------------------------+
//| تابع کمکی برای ارسال داده به سرور                               |
//+------------------------------------------------------------------+
void SendData(const string &url, const string &payload)
{
    char post_data[];
    char result_data[];
    string result_headers;
    
    int data_len = StringToCharArray(payload, post_data, 0, WHOLE_ARRAY, CP_UTF8);
    ArrayResize(post_data, data_len - 1);

    int res = WebRequest("POST", url, "Content-Type: application/json; charset=utf-8", 5000, post_data, result_data, result_headers);
    
    if(res == -1)
    {
        Print("Error in WebRequest: ", GetLastError());
    }
}
