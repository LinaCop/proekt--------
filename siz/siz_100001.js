// siz_100001.js
window.SIZ_DATA = window.SIZ_DATA || {};

window.SIZ_DATA["100001"] = {
  professionCode: "100001",
  professionName: "Авербандщик",
  types: [
    {
      typeId: "clothes",
      typeName: "Одежда специальная защитная",
      items: [
        {
          itemId: "kostyum_istiranie",
          name: "Костюм для защиты от механических воздействий (истирания)",
          norm: { value: 1, unit: "шт", period: "год" }
        }
      ]
    },
    {
      typeId: "feet",
      typeName: "Средства защиты ног",
      items: [
        {
          itemId: "obuv_istiranie",
          name: "Обувь специальная для защиты от механических воздействий (истирания)",
          norm: { value: 1, unit: "пара", period: "год" }
        }
      ]
    },
    {
      typeId: "hands",
      typeName: "Средства защиты рук",
      items: [
        {
          itemId: "perchatki_istiranie",
          name: "Перчатки для защиты от механических воздействий (истирания)",
          norm: { value: 12, unit: "пар", period: "год" }
        }
      ]
    }
  ]
};
