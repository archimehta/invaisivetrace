/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1615648943")

  // add field
  collection.fields.addAt(20, new Field({
    "help": "",
    "hidden": false,
    "id": "number2289751161",
    "max": null,
    "min": null,
    "name": "coverageAreaSqFt",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(21, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2178268537",
    "max": 32,
    "min": 0,
    "name": "estimateStatus",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(22, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3245166697",
    "max": 80,
    "min": 0,
    "name": "estimateReason",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(23, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2721523520",
    "max": 120,
    "min": 0,
    "name": "estimateCounty",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(24, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1164013431",
    "max": 8,
    "min": 0,
    "name": "estimateCountyGeoid",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(25, new Field({
    "help": "",
    "hidden": false,
    "id": "number4245794161",
    "max": null,
    "min": null,
    "name": "estimateLowUsd",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(26, new Field({
    "help": "",
    "hidden": false,
    "id": "number3335967999",
    "max": null,
    "min": null,
    "name": "estimateHighUsd",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(27, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2760696325",
    "max": 800,
    "min": 0,
    "name": "estimateMethod",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(28, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2677794248",
    "max": 1200,
    "min": 0,
    "name": "estimateRationale",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(29, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3352823068",
    "max": 1200,
    "min": 0,
    "name": "estimateAssumptions",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(30, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3662304205",
    "max": 500,
    "min": 0,
    "name": "estimateScope",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(31, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1900174065",
    "max": 500,
    "min": 0,
    "name": "estimateExclusions",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(32, new Field({
    "help": "",
    "hidden": false,
    "id": "json4018087421",
    "maxSize": 0,
    "name": "estimateSources",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(33, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3071175283",
    "max": 40,
    "min": 0,
    "name": "estimateGeneratedAt",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(34, new Field({
    "help": "",
    "hidden": false,
    "id": "number222531933",
    "max": null,
    "min": null,
    "name": "estimateInputVersion",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1615648943")

  // remove field
  collection.fields.removeById("number2289751161")

  // remove field
  collection.fields.removeById("text2178268537")

  // remove field
  collection.fields.removeById("text3245166697")

  // remove field
  collection.fields.removeById("text2721523520")

  // remove field
  collection.fields.removeById("text1164013431")

  // remove field
  collection.fields.removeById("number4245794161")

  // remove field
  collection.fields.removeById("number3335967999")

  // remove field
  collection.fields.removeById("text2760696325")

  // remove field
  collection.fields.removeById("text2677794248")

  // remove field
  collection.fields.removeById("text3352823068")

  // remove field
  collection.fields.removeById("text3662304205")

  // remove field
  collection.fields.removeById("text1900174065")

  // remove field
  collection.fields.removeById("json4018087421")

  // remove field
  collection.fields.removeById("text3071175283")

  // remove field
  collection.fields.removeById("number222531933")

  return app.save(collection)
})
