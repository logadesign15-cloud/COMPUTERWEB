(function () {
  "use strict";

  var WA_NUMBER = "601130842771";

  function waLink(message) {
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(message);
  }

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile navigation
  var menuBtn = document.querySelector(".menu-btn");
  var navLinks = document.querySelector(".navlinks");
  if (menuBtn && navLinks) {
    var setOpen = function (open) {
      navLinks.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    };
    menuBtn.addEventListener("click", function () {
      setOpen(!navLinks.classList.contains("open"));
    });
    navLinks.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  // Booking form
  var form = document.getElementById("booking-form");
  if (!form) return;

  var dateInput = document.getElementById("booking-date");
  if (dateInput) {
    // Earliest selectable date = today in Malaysia time
    var parts = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    var d = {};
    parts.forEach(function (p) { d[p.type] = p.value; });
    dateInput.min = d.year + "-" + d.month + "-" + d.day;
  }

  var status = document.getElementById("form-status");
  var fallback = document.getElementById("wa-fallback");
  var submitBtn = form.querySelector('button[type="submit"]');

  function setStatus(text, kind) {
    if (!status) return;
    status.textContent = text;
    status.className = "form-status" + (kind ? " " + kind : "");
  }

  function summary(data) {
    var lines = [
      "Hi NESH Computer Services, I would like to request a booking.",
      "Name: " + data.name,
      "Phone: " + data.phone,
      "Service: " + data.service,
      "Device: " + (data.device || "-"),
      "Date: " + data.date,
      "Time: " + data.slot,
      "Location: " + data.location,
      "Details: " + (data.details || "-")
    ];
    return lines.join("\n");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;

    var data = {};
    new FormData(form).forEach(function (value, key) { data[key] = String(value).trim(); });

    if (fallback) fallback.classList.remove("show");
    submitBtn.disabled = true;
    setStatus("Sending your booking request…", "");

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 20000);

    fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (!res.ok) throw new Error(body.error || "We couldn't send your request.");
          return body;
        });
      })
      .then(function () {
        form.reset();
        setStatus("Thank you! Your request was sent to NESH. We will contact you to confirm the appointment.", "ok");
      })
      .catch(function (err) {
        var msg = err && err.name === "AbortError"
          ? "The request took too long."
          : (err && err.message) || "We couldn't send your request.";
        setStatus(msg + " You can send the same details to us directly on WhatsApp instead.", "err");
        if (fallback) {
          var link = fallback.querySelector("a");
          if (link) link.href = waLink(summary(data));
          fallback.classList.add("show");
        }
      })
      .finally(function () {
        clearTimeout(timer);
        submitBtn.disabled = false;
      });
  });
})();
