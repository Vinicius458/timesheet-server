import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import * as cors from "cors";

initializeApp();

const db = getFirestore();

const corsHandler = cors({ origin: true });

export const timesheet = onRequest(async (request, response) => {
  corsHandler(request, response, async () => {
    const { userCode } = request.body;
    if (!userCode) {
      response.status(400).send("Código do usuário é necessário");
    }

    try {
      const userExist =
        (await db.collection("users").where("userCode", "==", userCode).get())
          .size > 0;

      if (!userExist) {
        response.status(400).send("Nenhum usuário com este código encontrado");
      }

      const serverTime = Timestamp.now();

      const pointsRef = db
        .collection("timesheet")
        .where("userCode", "==", userCode)
        .orderBy("serverTime", "desc")
        .limit(1);

      const pointSnapshot = await pointsRef.get();

      let pointType = "ENTRY_TIME";

      if (!pointSnapshot.empty) {
        const lastPoint = pointSnapshot.docs[0].data();

        pointType =
          lastPoint.status === "ENTRY_TIME" ? "END_TIME" : "ENTRY_TIME";
      }
      const timesheetRef = db.collection("timesheet").doc();

      await timesheetRef.set({
        userCode,
        serverTime,
        status: pointType,
        createdAt: serverTime,
      });

      response.status(200).send("Ponto registrado com sucesso");
    } catch (error) {
      response.status(400).send("Erro ao registrar o ponto. " + error);
    }
  });
});
