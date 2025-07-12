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

//+------------------------------------------------------------------+
//| Trade Transaction function (مهم: ثبت رویدادهای معاملاتی)         |
//+------------------------------------------------------------------+
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


void OnTradeTransaction(const MqlTradeTransaction &trans,
    const MqlTradeRequest &request,
    const MqlTradeResult &result)
{
//--- این تابع فقط برای اکسپرتی که روی بروکر "هدف" است باید کار کند
if(source_type != "target")
{
return;
}

//--- ما فقط به معاملاتی که به تاریخچه اضافه می‌شوند (اجرا شده) علاقه‌مندیم
if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
{
//--- دریافت اطلاعات معامله (Deal) از طریق تیکت آن
ulong deal_ticket = trans.deal;
if(HistoryDealSelect(deal_ticket))
{
long deal_order_id = HistoryDealGetInteger(deal_ticket, DEAL_ORDER);
string deal_symbol = HistoryDealGetString(deal_ticket, DEAL_SYMBOL);
double deal_volume = HistoryDealGetDouble(deal_ticket, DEAL_VOLUME);
double deal_price = HistoryDealGetDouble(deal_ticket, DEAL_PRICE);
double deal_profit = HistoryDealGetDouble(deal_ticket, DEAL_PROFIT);
double deal_commission = HistoryDealGetDouble(deal_ticket, DEAL_COMMISSION);
double deal_swap = HistoryDealGetDouble(deal_ticket, DEAL_SWAP);
ENUM_DEAL_TYPE deal_type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(deal_ticket, DEAL_TYPE);

//--- ساخت پِی‌لود JSON برای رویداد معامله
string payload = StringFormat("{\"source\":\"target\", \"broker\":\"%s\", \"type\":\"DEAL_ADD\", \"ticket\":%llu, \"order_id\":%llu, \"symbol\":\"%s\", \"volume\":%.2f, \"price\":%.5f, \"profit\":%.2f, \"commission\":%.2f, \"swap\":%.2f, \"deal_type\":\"%s\"}",
                      g_broker_name,
                      deal_ticket,
                      deal_order_id,
                      deal_symbol,
                      deal_volume,
                      deal_price,
                      deal_profit,
                      deal_commission,
                      deal_swap,
                      EnumToString(deal_type)
                      );

//--- ارسال داده به اندپوینت معاملات
SendData(server_url_trades, payload);
Print("Trade event sent for ticket: ", deal_ticket);
}
}
}
