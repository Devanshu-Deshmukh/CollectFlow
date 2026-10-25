package com.collectflow.config;

import com.collectflow.domain.Business;
import com.collectflow.domain.BusinessMembership;
import com.collectflow.domain.Customer;
import com.collectflow.domain.FollowUp;
import com.collectflow.domain.FollowUpStatus;
import com.collectflow.domain.FollowUpType;
import com.collectflow.domain.Invoice;
import com.collectflow.domain.InvoiceLine;
import com.collectflow.domain.InvoiceStatus;
import com.collectflow.domain.Payment;
import com.collectflow.domain.Reminder;
import com.collectflow.domain.ReminderStatus;
import com.collectflow.domain.Role;
import com.collectflow.domain.User;
import com.collectflow.repo.BusinessMembershipRepository;
import com.collectflow.repo.BusinessRepository;
import com.collectflow.repo.CustomerRepository;
import com.collectflow.repo.FollowUpRepository;
import com.collectflow.repo.InvoiceRepository;
import com.collectflow.repo.PaymentRepository;
import com.collectflow.repo.ReminderRepository;
import com.collectflow.repo.UserRepository;
import com.collectflow.service.InvoiceStatusService;
import com.collectflow.service.ReminderService;
import com.collectflow.service.ReminderTemplateService;
import com.collectflow.service.TemplateRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final BusinessMembershipRepository membershipRepository;
    private final CustomerRepository customerRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final FollowUpRepository followUpRepository;
    private final ReminderRepository reminderRepository;
    private final ReminderTemplateService templateService;
    private final ReminderService reminderService;
    private final InvoiceStatusService statusService;
    private final PasswordEncoder passwordEncoder;

    public DemoDataSeeder(UserRepository userRepository,
                          BusinessRepository businessRepository,
                          BusinessMembershipRepository membershipRepository,
                          CustomerRepository customerRepository,
                          InvoiceRepository invoiceRepository,
                          PaymentRepository paymentRepository,
                          FollowUpRepository followUpRepository,
                          ReminderRepository reminderRepository,
                          ReminderTemplateService templateService,
                          ReminderService reminderService,
                          InvoiceStatusService statusService,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.businessRepository = businessRepository;
        this.membershipRepository = membershipRepository;
        this.customerRepository = customerRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.followUpRepository = followUpRepository;
        this.reminderRepository = reminderRepository;
        this.templateService = templateService;
        this.reminderService = reminderService;
        this.statusService = statusService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByEmailIgnoreCase("demo@collectflow.app")) {
            return;
        }

        User owner = new User("Ananya Rao", "demo@collectflow.app",
                passwordEncoder.encode("demo12345"));
        owner.setCreatedAt(LocalDateTime.now().minusMonths(8));
        userRepository.save(owner);

        Business business = new Business();
        business.setName("Meridian Design Studio");
        business.setCurrency("INR");
        business.setEmail("accounts@meridiandesign.in");
        business.setPhone("+91 98450 22110");
        business.setAddress("4th Floor, Indiranagar, Bengaluru 560038");
        business.setCreatedAt(LocalDateTime.now().minusMonths(8));
        businessRepository.save(business);

        BusinessMembership membership = new BusinessMembership(owner, business, Role.OWNER);
        membership.setCreatedAt(LocalDateTime.now().minusMonths(8));
        membershipRepository.save(membership);

        templateService.seedDefaults(business);

        LocalDate today = LocalDate.now();

        Customer northstar = customer(business, "Northstar Logistics", "priya@northstarlogistics.in",
                "+91 98200 11223", "Northstar Logistics Pvt Ltd", "Retainer client since 2024.");
        Customer kavya = customer(business, "Kavya Textiles", "accounts@kavyatextiles.com",
                "+91 98330 44556", "Kavya Textiles", "Prefers invoices addressed to the accounts team.");
        Customer brightline = customer(business, "Brightline Media", "rahul@brightlinemedia.in",
                "+91 90040 77889", "Brightline Media LLP", null);
        Customer sundara = customer(business, "Sundara Foods", "finance@sundarafoods.in",
                "+91 98860 33445", "Sundara Foods Pvt Ltd", "Payment run on the 5th of each month.");
        Customer aria = customer(business, "Aria Interiors", "meera@ariainteriors.in",
                "+91 99000 66778", "Aria Interiors", null);
        Customer peakline = customer(business, "Peakline Consulting", "billing@peakline.co.in",
                "+91 97400 99001", "Peakline Consulting", "New client - first project invoiced in July.");

        Invoice inv1 = invoice(business, northstar, "INV-" + today.getYear() + "-0001",
                today.minusDays(45), today.minusDays(15), "Brand identity retainer - quarterly",
                "Design retainer", new BigDecimal("2"), new BigDecimal("59000"));
        Invoice inv2 = invoice(business, kavya, "INV-" + today.getYear() + "-0002",
                today.minusDays(80), today.minusDays(62), "Packaging design sprint",
                "Packaging design (6 SKUs)", new BigDecimal("1"), new BigDecimal("95000"));
        Invoice inv3 = invoice(business, brightline, "INV-" + today.getYear() + "-0003",
                today.minusDays(120), today.minusDays(100), "Campaign landing pages",
                "Landing page design", new BigDecimal("3"), new BigDecimal("28000"));
        Invoice inv4 = invoice(business, sundara, "INV-" + today.getYear() + "-0004",
                today.minusDays(20), today.plusDays(5), "Product catalogue design",
                "Catalogue layout", new BigDecimal("1"), new BigDecimal("64500"));
        Invoice inv5 = invoice(business, aria, "INV-" + today.getYear() + "-0005",
                today.minusDays(10), today.plusDays(20), "Website redesign milestone 2",
                "Website UI design", new BigDecimal("1"), new BigDecimal("120000"));
        Invoice inv6 = invoice(business, peakline, "INV-" + today.getYear() + "-0006",
                today.minusDays(35), today.minusDays(5), "Discovery workshop",
                "Workshop facilitation", new BigDecimal("2"), new BigDecimal("22500"));
        Invoice inv7 = invoice(business, northstar, "INV-" + today.getYear() + "-0007",
                today.minusDays(30), today.plusDays(45), "Motion graphics package",
                "Motion graphics", new BigDecimal("4"), new BigDecimal("18000"));
        Invoice inv8 = invoice(business, kavya, "INV-" + today.getYear() + "-0008",
                today.minusDays(60), today.minusDays(35), "Social media templates",
                "Template design", new BigDecimal("1"), new BigDecimal("32000"));
        Invoice inv9 = invoice(business, sundara, "INV-" + today.getYear() + "-0009",
                today.minusDays(70), today.minusDays(40), "Annual report design",
                "Annual report", new BigDecimal("1"), new BigDecimal("78000"));

        payment(inv2, new BigDecimal("40000"), today.minusDays(50), "BANK_TRANSFER", "UTR 889201");
        payment(inv6, new BigDecimal("45000"), today.minusDays(4), "UPI", "UPI/4471029");
        payment(inv9, new BigDecimal("78000"), today.minusDays(30), "BANK_TRANSFER", "UTR 771230");
        payment(inv1, new BigDecimal("30000"), today.minusDays(5), "BANK_TRANSFER", "UTR 992310");

        for (Invoice invoice : List.of(inv1, inv2, inv3, inv4, inv5, inv6, inv7, inv8, inv9)) {
            statusService.refresh(invoice);
            invoiceRepository.save(invoice);
            reminderService.scheduleForInvoice(invoice);
        }

        // A couple of reminders that already went out, so the history is not empty.
        sentReminder(inv1, today.minusDays(18), "Payment reminder: invoice " + inv1.getInvoiceNumber(),
                "Priya, invoice " + inv1.getInvoiceNumber() + " for "
                        + TemplateRenderer.formatMoney(inv1.outstandingAmount(), "INR") + " was due recently.");
        sentReminder(inv3, today.minusDays(93), "Payment reminder: invoice " + inv3.getInvoiceNumber(),
                "Rahul, invoice " + inv3.getInvoiceNumber() + " is now past due. Could you confirm the payment date?");

        followUp(inv1, owner, FollowUpType.CALL, "Spoke with Priya. Payment held up in their AP approval; promised to clear by Friday.",
                FollowUpStatus.DONE, today.minusDays(10), today.minusDays(6));
        followUp(inv1, owner, FollowUpType.TASK, "Call Priya again if the payment has not landed by Friday.",
                FollowUpStatus.OPEN, today.minusDays(1), today.minusDays(1));
        followUp(inv2, owner, FollowUpType.EMAIL, "Sent a copy of the invoice and the purchase order reference.",
                FollowUpStatus.DONE, today.minusDays(40), today.minusDays(25));
        followUp(inv2, owner, FollowUpType.TASK, "Confirm the remaining 55,000 with Kavya's accounts team.",
                FollowUpStatus.OPEN, today.minusDays(8), today.minusDays(8));
        followUp(inv3, owner, FollowUpType.WHATSAPP, "Nudged Rahul on WhatsApp; he asked for a revised PO.",
                FollowUpStatus.DONE, today.minusDays(70), today.minusDays(60));
        followUp(inv3, owner, FollowUpType.TASK, "Escalate Brightline Media to a formal demand notice.",
                FollowUpStatus.OPEN, today.minusDays(20), today.minusDays(20));
        followUp(inv8, owner, FollowUpType.NOTE, "Kavya says the invoice is with their auditor for approval.",
                FollowUpStatus.DONE, today.minusDays(20), today.minusDays(20));

        log.info("Demo data created. Sign in with demo@collectflow.app / demo12345");
    }

    private Customer customer(Business business, String name, String email, String phone,
                              String company, String notes) {
        Customer customer = new Customer();
        customer.setBusiness(business);
        customer.setName(name);
        customer.setEmail(email);
        customer.setPhone(phone);
        customer.setCompany(company);
        customer.setNotes(notes);
        customer.setCreatedAt(LocalDateTime.now().minusMonths(6));
        return customerRepository.save(customer);
    }

    private Invoice invoice(Business business, Customer customer, String number, LocalDate issueDate,
                            LocalDate dueDate, String description, String lineDescription,
                            BigDecimal quantity, BigDecimal unitPrice) {
        Invoice invoice = new Invoice();
        invoice.setBusiness(business);
        invoice.setCustomer(customer);
        invoice.setInvoiceNumber(number);
        invoice.setIssueDate(issueDate);
        invoice.setDueDate(dueDate);
        invoice.setCurrency("INR");
        invoice.setNotes(description);
        InvoiceLine line = new InvoiceLine(lineDescription, quantity, unitPrice);
        invoice.addLine(line);
        invoice.setTotalAmount(line.getAmount());
        invoice.setAmountPaid(BigDecimal.ZERO);
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setCreatedAt(issueDate.atTime(11, 0));
        invoice.setUpdatedAt(LocalDateTime.now());
        return invoiceRepository.save(invoice);
    }

    private void payment(Invoice invoice, BigDecimal amount, LocalDate date, String method, String reference) {
        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setAmount(amount);
        payment.setPaymentDate(date);
        payment.setMethod(method);
        payment.setReference(reference);
        payment.setCreatedAt(date.atTime(15, 30));
        paymentRepository.save(payment);
        invoice.setAmountPaid(invoice.getAmountPaid().add(amount));
        invoiceRepository.save(invoice);
    }

    private void sentReminder(Invoice invoice, LocalDate date, String subject, String body) {
        Reminder reminder = new Reminder();
        reminder.setInvoice(invoice);
        reminder.setScheduledAt(date.atTime(9, 0));
        reminder.setSentAt(date.atTime(9, 2));
        reminder.setStatus(ReminderStatus.SENT);
        reminder.setRecipientEmail(invoice.getCustomer().getEmail());
        reminder.setSubject(subject);
        reminder.setBody(body);
        reminder.setNote("Email delivery disabled - reminder logged only");
        reminder.setCreatedAt(date.atTime(9, 0));
        reminderRepository.save(reminder);
    }

    private void followUp(Invoice invoice, User user, FollowUpType type, String notes,
                          FollowUpStatus status, LocalDate dueDate, LocalDate createdDate) {
        FollowUp followUp = new FollowUp();
        followUp.setInvoice(invoice);
        followUp.setActivityType(type);
        followUp.setNotes(notes);
        followUp.setCreatedBy(user);
        followUp.setAssignedTo(type == FollowUpType.TASK ? user : null);
        followUp.setDueDate(type == FollowUpType.TASK ? dueDate : null);
        followUp.setStatus(status);
        followUp.setCreatedAt(createdDate.atTime(10, 0));
        followUp.setCompletedAt(status == FollowUpStatus.DONE ? createdDate.atTime(17, 0) : null);
        followUpRepository.save(followUp);
    }
}
