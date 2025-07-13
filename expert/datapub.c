//+------------------------------------------------------------------+
//|     ProppingBoard - Unified Expert (Live Ticks + History + UI) |
//+------------------------------------------------------------------+
#property strict
#property version   "1.0"
#property copyright "Gemini & You"

//--- ورودی‌های قابل تنظیم
input string source_identifier  = "reference_lmax";
input string source_type        = "reference";  // target یا reference
input string server_url_ticks   = "http://127.0.0.1:5000/tick";
input string server_url_data    = "http://127.0.0.1:5000/data";
input int    bars_to_send       = 500;

//--- متغیرهای داخلی
string g_broker_name;
long   g_account_number;
bool   g_is_demo_account;
ENUM_TIMEFRAMES g_current_period;
bool g_is_sending = false;

//+------------------------------------------------------------------+
int OnInit()
{
    g_broker_name = AccountInfoString(ACCOUNT_COMPANY);
    g_account_number = AccountInfoInteger(ACCOUNT_LOGIN);
    g_is_demo_account = (AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_DEMO);

    Print("✅ Merged Expert Initialized");
    g_current_period = _Period;

    // ابتدا ارسال تاریخچه و سپس ریست چارت
    SendHistoricalData(bars_to_send);
    SendResetSignal();

    EventSetTimer(1);
    return(INIT_SUCCEEDED);
}
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    Print("🛑 Merged Expert Deinitialized");
    EventKillTimer();
}
//+------------------------------------------------------------------+
//| TICK: ارسال قیمت لحظه‌ای و آخرین کندل                          |
//+------------------------------------------------------------------+
void OnTick()
{
    MqlTick latest_tick;
    if (SymbolInfoTick(_Symbol, latest_tick))
    {
        string payload = StringFormat(
            "{\"sourceIdentifier\":\"%s\",\"broker\":\"%s\",\"accountNumber\":%d,\"accountType\":\"%s\",\"symbol\":\"%s\",\"bid\":%.5f,\"ask\":%.5f,\"time_msc\":%llu}",
            source_identifier,
            g_broker_name,
            g_account_number,
            g_is_demo_account ? "Demo" : "Real",
            _Symbol,
            latest_tick.bid,
            latest_tick.ask,
            latest_tick.time_msc
        );
        SendData(server_url_ticks, payload);
    }

    // همچنین آخرین کندل رو به صورت update_data بفرست
    MqlRates rates[1];
    if (CopyRates(_Symbol, _Period, 0, 1, rates) > 0)
    {
        string payload2 = StringFormat(
            "{\"symbol\":\"%s\",\"period\":\"%s\",\"type\":\"update_data\",\"data\":{\"time\":%d,\"open\":%s,\"high\":%s,\"low\":%s,\"close\":%s}}",
            _Symbol,
            EnumToString(_Period),
            rates[0].time,
            PriceToString(rates[0].open),
            PriceToString(rates[0].high),
            PriceToString(rates[0].low),
            PriceToString(rates[0].close)
        );
        SendData(server_url_data, payload2);
    }
}
//+------------------------------------------------------------------+
//| TIMER: بررسی تغییر تایم‌فریم یا ارسال مجدد تاریخچه             |
//+------------------------------------------------------------------+
void OnTimer()
{
    if (_Period != g_current_period)
    {
        g_current_period = _Period;
        Print("🔁 Period changed: ", EnumToString(g_current_period));
        SendHistoricalData(bars_to_send);
        SendResetSignal();
    }
}
//+------------------------------------------------------------------+
//| ارسال تاریخچه قیمت                                              |
//+------------------------------------------------------------------+
void SendHistoricalData(int bar_count)
{
    MqlRates rates[];
    ArraySetAsSeries(rates, true);
    int copied = CopyRates(_Symbol, _Period, 0, bar_count, rates);

    if (copied > 0)
    {
        string json_array = "[";
        for (int i = copied - 1; i >= 0; i--)
        {
            json_array += StringFormat(
                "{\"time\":%d,\"open\":%s,\"high\":%s,\"low\":%s,\"close\":%s}",
                rates[i].time,
                PriceToString(rates[i].open),
                PriceToString(rates[i].high),
                PriceToString(rates[i].low),
                PriceToString(rates[i].close)
            );
            if (i > 0) json_array += ",";
        }
        json_array += "]";

        string payload = StringFormat(
            "{\"symbol\":\"%s\",\"period\":\"%s\",\"type\":\"history_data\",\"data\":%s}",
            _Symbol,
            EnumToString(_Period),
            json_array
        );

        SendData(server_url_data, payload);
        Print("📤 Sent ", copied, " bars of historical data.");
    }
    else
    {
        Print("⚠️ CopyRates failed: ", GetLastError());
    }
}
//+------------------------------------------------------------------+
//| ارسال سیگنال chart_reset برای UI                                |
//+------------------------------------------------------------------+
void SendResetSignal()
{
    string payload = StringFormat(
        "{\"symbol\":\"%s\",\"type\":\"chart_reset\",\"period\":\"%s\"}",
        _Symbol,
        EnumToString(_Period)
    );

    SendData(server_url_data, payload);
    Print("📨 chart_reset sent.");
}
//+------------------------------------------------------------------+
//| ارسال داده به سرور (POST WebRequest)                            |
//+------------------------------------------------------------------+
void SendData(const string &url, const string &payload)
{
    if (g_is_sending) return;
    g_is_sending = true;

    char post_data[];
    char result_data[];
    string result_headers;

    int len = StringToCharArray(payload, post_data, 0, WHOLE_ARRAY, CP_UTF8);
    if (len > 0 && post_data[len - 1] == 0)
        ArrayResize(post_data, len - 1);

    int res = WebRequest("POST", url,
                         "Content-Type: application/json; charset=utf-8",
                         5000, post_data, result_data, result_headers);

    if (res == -1)
        Print("❌ WebRequest failed: ", GetLastError());

    g_is_sending = false;
}
//+------------------------------------------------------------------+
string PriceToString(double price)
{
    return DoubleToString(price, (int)_Digits);
}
