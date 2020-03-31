"use strict";

const { Contract } = require("fabric-contract-api");

class PharmanetContract extends Contract {
  constructor() {
    // Provide a custom name to refer to this smart contract
    super("org.pharma-network.pharmanet");
  }

  /* ****** All custom functions are defined below ***** */

  // This is a basic user defined function used at the time of instantiating the smart contract
  // to print the success message on console
  async instantiate(ctx) {
    console.log("Pharmanet Smart Contract Instantiated Super successful");
  }

  async getMe(ctx) {
    return "hello sushma";
  }

  async getMeAtLast(ctx, name) {
    let a = "hello" + name + "blablabla success";
    return a;
  }

  async registerCompany(ctx, companyCRN, companyName, location, organisationRole) {
    console.log("Registering the company " + companyName);

    const companyID = ctx.stub.createCompositeKey("org.pharma-network.pharmanet.company", [companyCRN, companyName]);

    if (
      organisationRole !== "Manufacturer" &&
      organisationRole !== "Distributor" &&
      organisationRole !== "Retailer" &&
      organisationRole !== "Transporter"
    ) {
      return "Invalid Organisation Role";
    } else {
      let hierarchyKey;
      if (organisationRole === "Manufacturer") {
        hierarchyKey = "1";
      } else if (organisationRole === "Distributor") {
        hierarchyKey = "2";
      } else if (organisationRole === "Retailer") {
        hierarchyKey = "3";
      } else if (organisationRole === "Transporter") {
        hierarchyKey = "";
      }
      let companyObject = {
        companyID: companyID,
        name: companyName,
        location: location,
        organisationRole: organisationRole,
        hierarchyKey: hierarchyKey,
        createdAt: new Date()
      };

      let companyDataBuffer = Buffer.from(JSON.stringify(companyObject));
      await ctx.stub.putState(companyID, companyDataBuffer);
      return companyObject;
    }
  }
}

module.exports = PharmanetContract;
