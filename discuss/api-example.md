# 以下是其他系统投资组合管理的部分API响应数据

## 获取组合概况接口的响应数据
```
{
    "result_data": {
        "portfolio": [
            {
                "market": "CHA",
                "name": "A股",
                "assets": 49670.19,
                "principal": 50000.0,
                "cash": 19742.19,
                "sign": "¥",
                "currency": "CNY",
                "market_value": 29928.0,
                "float_amount": -839.56,
                "float_rate": -0.0273,
                "accum_amount": -329.81,
                "accum_rate": -0.0066,
                "day_float_amount": -52.0,
                "day_float_rate": -0.001,
                "list": [
                    {
                        "symbol": "SZ000858",
                        "name": "五粮液",
                        "shares": 200.0,
                        "current": 122.49,
                        "change": -0.06,
                        "percentage": -0.05,
                        "currency": "CNY",
                        "diluted_cost": 124.409,
                        "hold_cost": 127.578,
                        "market_value": 24498.0,
                        "float_amount": -1017.56,
                        "float_rate": -0.0399,
                        "accum_amount": -383.75,
                        "accum_rate": -0.015,
                        "day_float_amount": -12.0,
                        "day_float_rate": -5.0E-4,
                        "open_time": 1747670400000,
                        "liquidation_time": 0,
                        "delay_remark": ""
                    },
                    {
                        "symbol": "SZ000977",
                        "name": "浪潮信息",
                        "shares": 100.0,
                        "current": 54.3,
                        "change": -0.4,
                        "percentage": -0.73,
                        "currency": "CNY",
                        "diluted_cost": 53.761,
                        "hold_cost": 52.52,
                        "market_value": 5430.0,
                        "float_amount": 178.0,
                        "float_rate": 0.0339,
                        "accum_amount": 53.94,
                        "accum_rate": 0.0051,
                        "day_float_amount": -40.0,
                        "day_float_rate": -0.0073,
                        "open_time": 1742832000000,
                        "liquidation_time": 0,
                        "delay_remark": ""
                    }
                ]
            }
        ]
    },
    "msg": null,
    "result_code": "60000",
    "success": true
}
```

## 获取组合中所有投资品种交易记录接口的响应数据

```
{
    "result_data": {
        "pos": 6293328124529360,
        "transactions": [
            {
                "id": null,
                "tid": 6293329567369954,
                "uid": 6233117363,
                "symbol": "SZ000977",
                "name": "浪潮信息",
                "type": 2,
                "time": 1753372800000,
                "shares": 100.0,
                "price": 51.2,
                "comment": "",
                "commission": 1.0,
                "tax": null,
                "gid": 6282784617382278,
                "commission_rate": null,
                "tax_rate": 0.5,
                "unit_shares": null,
                "unit_dividend": null,
                "unit_increase_shares": null,
                "record_date": null,
                "type_name": "卖出",
                "desc": "",
                "amount": 5120.0
            },
            {
                "id": null,
                "tid": 6293318377181083,
                "uid": 6233117363,
                "symbol": "SZ000858",
                "name": "五粮液",
                "type": 9,
                "time": 1752768000000,
                "shares": 0.0,
                "price": 0.0,
                "comment": "",
                "commission": null,
                "tax": 0.0,
                "gid": 6282784617382278,
                "commission_rate": null,
                "tax_rate": 0.0,
                "unit_shares": null,
                "unit_dividend": 31.69,
                "unit_increase_shares": null,
                "record_date": 1752681600000,
                "type_name": "除权除息",
                "desc": "每10股股息31.69",
                "amount": 633.8
            },
            {
                "id": null,
                "tid": 6293328678177495,
                "uid": 6233117363,
                "symbol": "SZ000977",
                "name": "浪潮信息",
                "type": 1,
                "time": 1749744000000,
                "shares": 100.0,
                "price": 49.02,
                "comment": "",
                "commission": 1.0,
                "tax": null,
                "gid": 6282784617382278,
                "commission_rate": null,
                "tax_rate": null,
                "unit_shares": null,
                "unit_dividend": null,
                "unit_increase_shares": null,
                "record_date": null,
                "type_name": "买入",
                "desc": "",
                "amount": 4902.0
            },
            {
                "id": null,
                "tid": 6293319635378615,
                "uid": 6233117363,
                "symbol": "SZ000858",
                "name": "五粮液",
                "type": 1,
                "time": 1748188800000,
                "shares": 100.0,
                "price": 126.07,
                "comment": "",
                "commission": null,
                "tax": null,
                "gid": 6282784617382278,
                "commission_rate": 0.1,
                "tax_rate": null,
                "unit_shares": null,
                "unit_dividend": null,
                "unit_increase_shares": null,
                "record_date": null,
                "type_name": "买入",
                "desc": "",
                "amount": 12607.0
            },
            {
                "id": null,
                "tid": 6293328124529361,
                "uid": 6233117363,
                "symbol": "SZ000977",
                "name": "浪潮信息",
                "type": 9,
                "time": 1747929600000,
                "shares": 0.0,
                "price": 0.0,
                "comment": "",
                "commission": null,
                "tax": null,
                "gid": 6282784617382278,
                "commission_rate": null,
                "tax_rate": null,
                "unit_shares": null,
                "unit_dividend": 1.15,
                "unit_increase_shares": null,
                "record_date": 1747843200000,
                "type_name": "除权除息",
                "desc": "每10股股息1.15",
                "amount": 11.5
            },
            {
                "id": null,
                "tid": 6293318377181082,
                "uid": 6233117363,
                "symbol": "SZ000858",
                "name": "五粮液",
                "type": 1,
                "time": 1747670400000,
                "shares": 100.0,
                "price": 129.06,
                "comment": "",
                "commission": null,
                "tax": null,
                "gid": 6282784617382278,
                "commission_rate": 0.1,
                "tax_rate": null,
                "unit_shares": null,
                "unit_dividend": null,
                "unit_increase_shares": null,
                "record_date": null,
                "type_name": "买入",
                "desc": "",
                "amount": 12906.0
            },
            {
                "id": null,
                "tid": 6293328124529360,
                "uid": 6233117363,
                "symbol": "SZ000977",
                "name": "浪潮信息",
                "type": 1,
                "time": 1742832000000,
                "shares": 100.0,
                "price": 56.0,
                "comment": "",
                "commission": 1.0,
                "tax": null,
                "gid": 6282784617382278,
                "commission_rate": null,
                "tax_rate": null,
                "unit_shares": null,
                "unit_dividend": null,
                "unit_increase_shares": null,
                "record_date": null,
                "type_name": "买入",
                "desc": "",
                "amount": 5600.0
            }
        ]
    },
    "msg": null,
    "result_code": "60000",
    "success": true
}
```

## 获取组合银证转帐记录接口的响应数据

```
{
    "result_data": {
        "pos": 6293311783735161,
        "bank_transfers": [
            {
                "id": 988717,
                "tid": 6293311783735161,
                "uid": 6233117363,
                "gid": 6282784617382278,
                "type": 1,
                "market": "CHA",
                "amount": 50000.0,
                "time": 1746028800000,
                "create_at": 1753432312959,
                "update_at": 1753435551206
            }
        ]
    },
    "msg": null,
    "result_code": "60000",
    "success": true
}
```