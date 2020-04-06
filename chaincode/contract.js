"use strict";

const { Contract } = require("fabric-contract-api");
const ClientIdentity = require("fabric-shim").ClientIdentity;
const util = require("util");

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

  async registerCompany(ctx, companyCRN, companyName, location, organisationRole) {
    console.log("Registering the company " + companyName);

    let cid = new ClientIdentity(ctx.stub);
    let mspID = cid.getMSPID();

    console.log("MSPID of the transaction initiator is=> " + mspID);

    if ("consumerMSP" !== mspID) {
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
          createdAt: new Date(),
        };

        let companyDataBuffer = Buffer.from(JSON.stringify(companyObject));
        await ctx.stub.putState(companyID, companyDataBuffer);
        return companyObject;
      }
    }
  }

  async addDrug(ctx, drugName, serialNo, mfgDate, expDate, companyCRN) {
    console.info(" Add Drug ", drugName, serialNo, mfgDate, expDate, companyCRN);

    let companyResultsIterator = await ctx.stub.getStateByPartialCompositeKey("org.pharma-network.pharmanet.company", [
      companyCRN,
    ]);

    // Iterate through result set and for each company found.
    while (true) {
      //To-Do - May have to include a flag
      let responseRange = await companyResultsIterator.next();
      console.log("responseRange=> " + responseRange);
      if (!responseRange || !responseRange.value || !responseRange.value.key) {
        return "Invalid companyCRN";
      }
      console.log("ResponseRange.value.key=>" + responseRange.value.key);

      let objectType;
      let attributes;
      ({ objectType, attributes } = await ctx.stub.splitCompositeKey(responseRange.value.key));

      let returnedCompanyName = attributes[0];
      let returnedCompanyCRN = attributes[1];

      // index:org.pharma-network.pharmanet.company namespace:CRN1 companyname:Digi
      console.info(
        util.format(
          "- found a company from namespace:%s companyname:%s companycrn:%s\n",
          objectType,
          returnedCompanyName,
          returnedCompanyCRN
        )
      );

      let cid = new ClientIdentity(ctx.stub);
      let mspID = cid.getMSPID();

      console.log("MSPID of the transaction initiator is=> " + mspID);

      //let isManufacturer = false;

      if ("manufacturerMSP" === mspID) {
        //isManufacturer = true;
        console.log("yes he is a manufacturer");

        const productID = ctx.stub.createCompositeKey("org.pharma-network.pharmanet.drug", [drugName, serialNo]);

        // const manufacturerId = ctx.clientIdentity.getID();
        // console.log("manufacturerId is=> " + manufacturerId.toString());
        // const manufactureID = ctx.stub.createCompositeKey([manufacturerId]);

        //create the drug object to store on the ledger
        let drugObject = {
          productID: productID,
          name: drugName,
          manufacturer: ctx.clientIdentity.getID(),
          manufacturingDate: mfgDate,
          expiryDate: expDate,
          owner: ctx.clientIdentity.getID(),
          shipment: "",
        };

        console.log("drugObject created is==> " + drugObject);

        let drugDataBuffer = Buffer.from(JSON.stringify(drugObject));
        await ctx.stub.putState(productID, drugDataBuffer);
        return drugObject;
      } else {
        //isManufacturer = false;
        return "No one can add a drug but Manufacturer.";
        console.log("No. Not a a Manufacturer");
      }
    }
  }

  async viewDrugCurrentState(ctx, drugName, serialNo) {
    //Visible for all network participants
    const productID = ctx.stub.createCompositeKey("org.pharma-network.pharmanet.drug", [drugName, serialNo]);
    console.log("ProductID is=> " + productID);
    let drugDataBuffer = await ctx.stub.getState(productID).catch((err) => console.log(err));
    return JSON.parse(drugDataBuffer.toString());
  }

  async viewHistory(ctx, drugName, serialNo) {
    const productID = ctx.stub.createCompositeKey("org.pharma-network.pharmanet.drug", [drugName, serialNo]);
    console.info("getting history for key: " + productID);
    let iterator = await ctx.stub.getHistoryForKey(productID);
    let result = [];
    let res = await iterator.next();
    while (!res.done) {
      if (res.value) {
        console.info(`found state update with value: ${res.value.value.toString("utf8")}`);
        const obj = JSON.parse(res.value.value.toString("utf8"));
        result.push(obj);
      }
      res = await iterator.next();
    }
    await iterator.close();
    return result;
  }

  //Remove this function-NOT FOR SUBMISSION
  async getCompanyDetails(ctx, companyCRN) {
    let companyResultsIterator = await ctx.stub.getStateByPartialCompositeKey("org.pharma-network.pharmanet.company", [
      companyCRN,
    ]);

    let responseRange = await companyResultsIterator.next();
    console.log("responseRange=> " + responseRange);
    if (!responseRange || !responseRange.value || !responseRange.value.key) {
      return "Invalid companyCRN";
    }
    console.log("ResponseRange.value.key=>" + responseRange.value.key);

    let objectType;
    let attributes;
    ({ objectType, attributes } = await ctx.stub.splitCompositeKey(responseRange.value.key));

    let returnedCompanyName = attributes[0];
    let returnedCompanyCRN = attributes[1];

    const generateCompanyID = await ctx.stub.createCompositeKey("org.pharma-network.pharmanet.company", [
      returnedCompanyName,
      returnedCompanyCRN,
    ]);

    console.log("generated company ID is=> " + generateCompanyID);

    let comapnyBuffer = await ctx.stub.getState(generateCompanyID).catch((err) => console.log(err));
    console.log("comapnyBuffer=> " + comapnyBuffer.toString());
    let parsedData = JSON.parse(comapnyBuffer.toString());
    return parsedData;
  }

  //This function is used to create a Purchase Order (PO) to buy drugs,
  //by companies belonging to ‘Distributor’ or ‘Retailer’ organisation.
  //createPO (buyerCRN, sellerCRN, drugName, quantity)
  async createPO(ctx, buyerCRN, sellerCRN, drugName, quantity) {
    //Check the initiator of the transaction is ‘Distributor’ or ‘Retailer’
    let cid = new ClientIdentity(ctx.stub);

    //Uncomment me
    // let mspID = cid.getMSPID();

    //remove me
    let mspID = "distributorMSP";
    console.log(
      "buyerCRN is=>" + buyerCRN + "sellerCRN=> " + sellerCRN + "drugName=> " + drugName + "quantity=>" + quantity
    );
    //Create PO to buy drugs, by the comapnies belonging to "Distributor" or "Retailer" organisation.
    if ("retailerMSP" !== mspID && "distributorMSP" !== mspID) {
      return "Sorry! Only Distributor and Retailer can create a purchase request!";
    } else {
      // Go ahead and check the hierarchy
      let sellerCRNResultsIterator = await ctx.stub.getStateByPartialCompositeKey(
        "org.pharma-network.pharmanet.company",
        [sellerCRN]
      );

      var sellerCRNFound = false;
      while (!sellerCRNFound) {
        let sellerCRNResponseRange = await sellerCRNResultsIterator.next();

        if (!sellerCRNResponseRange || !sellerCRNResponseRange || !sellerCRNResponseRange.value.key) {
          return "Invalid Seller CompanyCRN";
        } else {
          sellerCRNFound = true;
          let objectType;
          let attributes;
          ({ objectType, attributes } = await ctx.stub.splitCompositeKey(sellerCRNResponseRange.value.key));

          let returnedSellerCompanyName = attributes[0];
          let returnedSellerCompanyCRN = attributes[1];

          console.info(
            util.format(
              "- found a company from namespace:%s companyname:%s companycrn:%s\n",
              objectType,
              returnedSellerCompanyName,
              returnedSellerCompanyCRN
            )
          );

          const generateSellerCompanyID = await ctx.stub.createCompositeKey("org.pharma-network.pharmanet.company", [
            returnedSellerCompanyName,
            returnedSellerCompanyCRN,
          ]);

          var sellerCompanyBuffer = await ctx.stub.getState(generateSellerCompanyID).catch((err) => console.log(err));
          console.log("Seller Company Details are=> " + sellerCompanyBuffer.toString());
        }
      }

      let buyerCRNResultsIterator = await ctx.stub.getStateByPartialCompositeKey(
        "org.pharma-network.pharmanet.company",
        [buyerCRN]
      );

      var buyerCRNFound = false;
      while (!buyerCRNFound) {
        let buyerCRNResponseRange = await buyerCRNResultsIterator.next();

        if (!buyerCRNResponseRange || !buyerCRNResponseRange || !buyerCRNResponseRange.value.key) {
          return "Invalid Seller CompanyCRN";
        } else {
          buyerCRNFound = true;
          let objectType;
          let attributes;
          ({ objectType, attributes } = await ctx.stub.splitCompositeKey(buyerCRNResponseRange.value.key));

          let returnedBuyerCompanyName = attributes[0];
          let returnedBuyerCompanyCRN = attributes[1];

          console.info(
            util.format(
              "- found a company from namespace:%s companyname:%s companycrn:%s\n",
              objectType,
              returnedBuyerCompanyName,
              returnedBuyerCompanyCRN
            )
          );

          const generateBuyerCompanyID = await ctx.stub.createCompositeKey("org.pharma-network.pharmanet.company", [
            returnedBuyerCompanyName,
            returnedBuyerCompanyCRN,
          ]);

          var buyerCompanyBuffer = await ctx.stub.getState(generateBuyerCompanyID).catch((err) => console.log(err));
          console.log("Buyer Company Details are=> " + buyerCompanyBuffer.toString());
        }
      }
    }

    console.log("I am the Buyer=> " + buyerCompanyBuffer);
    console.log("I am the seller=> " + sellerCompanyBuffer);
    let buyerData = JSON.parse(buyerCompanyBuffer.toString());
    console.log("buyerData=> " + buyerData);
    let sellerData = JSON.parse(sellerCompanyBuffer.toString());
    console.log("sellerData=> " + sellerData.organisationRole);

    //Check hierachy
    if (buyerData.organisationRole === "Retailer") {
      console.log("Retailer can purchase only from Distributor");
      if (sellerData.organisationRole === "Distributor") {
        //All Good, Create a purchase request
        console.log("All Good, Create a purchase request");
      } else {
        let returnValue = "Sorry!" + buyerData.organisationRole + " can't purchase from " + sellerData.organisationRole;
        console.log("Sorry!" + buyerData.organisationRole + " can't purchase from " + sellerData.organisationRole);
        return returnValue;
      }
    } else if (buyerData.organisationRole === "Distributor") {
      console.log("Distributor can purchase only from Manufacturer");
      if (sellerData.organisationRole === "Manufacturer") {
        //All Good, Create a purchase request
        console.log("All Good, Create a purchase request");
      } else {
        let returnValue = "Sorry!" + buyerData.organisationRole + " can't purchase from " + sellerData.organisationRole;
        console.log("Sorry!" + buyerData.organisationRole + " can't purchase from " + sellerData.organisationRole);
        return returnValue;
      }
    } else {
      console.log(buyerData.organisationRole + " can't purchase from " + sellerData.organisationRole);
      let returnValue = buyerData.organisationRole + " can't purchase from " + sellerData.organisationRole;
      return returnValue;
    }
  }
}

module.exports = PharmanetContract;
