//+------------------------------------------------------------------+
//|                                           ProppingBoardEA.mq5    |
//|                      Copyright 2024, Gemini & Your Name          |
//|               (Data Collector for Propping Board System)         |
//+------------------------------------------------------------------+
#property copyright "Gemini & Your Name"
#property version   "1.0"
#property strict

//--- ورودی‌های اکسپرت (مهم‌ترین بخش برای تنظیم)
input string source_type      = "target"; // نقش این اکسپرت: "target" یا "reference"
input string server_url_ticks = "http://127.0.0.1:5000/tick"; // آدرس اندپوینت تیک
input string server_url_trades= "http://127.0.0.1:5000/trade"; // آدرس اندپوینت معاملات

//--- متغیرهای گلوبال
string g_broker_name;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    g_broker_name = AccountInfoString(ACCOUNT_COMPANY);
    PrintFormat("Propping Board EA Initialized. Source Type: '%s', Broker: '%s'", source_type, g_broker_name);
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    Print("Propping Board EA Deinitialized. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function (ارسال قیمت لحظه‌ای)                        |
//+------------------------------------------------------------------+
void OnTick()
{
    //--- دریافت قیمت لحظه‌ای
    MqlTick latest_tick;
    if(!SymbolInfoTick(_Symbol, latest_tick))
    {
        return;
    }

    //--- ساخت پِی‌لود JSON
    string payload = StringFormat("{\"source\":\"%s\", \"broker\":\"%s\", \"symbol\":\"%s\", \"bid\":%.5f, \"ask\":%.5f, \"time_msc\":%llu}",
                                  source_type,
                                  g_broker_name,
                                  _Symbol,
                                  latest_tick.bid,
                                  latest_tick.ask,
                                  latest_tick.time_msc);

    //--- ارسال داده به سرور
    SendData(server_url_ticks, payload);
}

//+------------------------------------------------------------------+
//| Trade Transaction function (مهم: ثبت رویدادهای معاملاتی)         |
//+------------------------------------------------------------------+
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


//+------------------------------------------------------------------+
//| تابع کمکی برای ارسال داده به سرور                               |
//+------------------------------------------------------------------+
void SendData(const string &url, const string &payload)
{
    char post_data[];
    char result_data[];
    string result_headers;
    
    int data_len = StringToCharArray(payload, post_data, 0, WHOLE_ARRAY, CP_UTF8);
    // WebRequest نیاز به آرایه بدون نال ترمینیتور دارد
    ArrayResize(post_data, data_len - 1);

    int res = WebRequest("POST", url, "Content-Type: application/json; charset=utf-8", 5000, post_data, result_data, result_headers);
    
    if(res == -1)
    {
        Print("Error in WebRequest: ", GetLastError());
    }
}
