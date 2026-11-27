import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StudentHeader } from "../../components/Layout";
import { Alert, Badge, Button } from "../../components/UI";
import { api, formatDate } from "../../lib/api";

export default function Offers() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  function loadOffers() {
    api("/api/v1/student/offers")
      .then((d) => setOffers(d.offers || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadOffers(); }, []);

  async function respond(offerId, action) {
    setError("");
    setBusyId(offerId);
    try {
      await api(`/api/v1/student/offers/${offerId}/${action}`, { method: "POST" });
      if (action === "accept") {
        navigate(`/student/payments?offerId=${offerId}`);
      } else {
        loadOffers();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <StudentHeader />
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Seat Allotment Offers</h1>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading offers...</p>
        ) : offers.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-md p-6 text-sm text-zinc-500">
            No seat offers issued yet.
          </div>
        ) : (
          offers.map((offer) => (
            <div key={offer.id} className="bg-white border border-zinc-200 rounded-md p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="font-semibold text-zinc-900">{offer.application?.admissionTrack?.program?.name}</h2>
                  <Badge variant={offer.status === "DECLINED" ? "danger" : "success"}>{offer.status}</Badge>
                </div>
                <p className="text-xs text-zinc-500 mt-1 tabular-nums">
                  App #{offer.application?.applicationNumber} | Category: {offer.categoryCode} | Accept by: {formatDate(offer.acceptBy)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {offer.status === "OFFERED" && (
                  <>
                    <Button size="sm" isLoading={busyId === offer.id} onClick={() => respond(offer.id, "accept")}>
                      Accept Seat
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === offer.id} onClick={() => respond(offer.id, "decline")}>
                      Decline
                    </Button>
                  </>
                )}
                {["ACCEPTED", "PAYMENT_PENDING"].includes(offer.status) && (
                  <Link to={`/student/payments?offerId=${offer.id}`}>
                    <Button size="sm">Proceed to Fee Payment</Button>
                  </Link>
                )}
                {offer.status === "CONFIRMED" && (
                  <Link to="/student/admission">
                    <Button size="sm" variant="outline">View Admission Letter</Button>
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
