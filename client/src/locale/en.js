const en = {
    code: "EN",
    name: "English",
    languages: {
        language: "Language",
        en: "English",
        nl: "Dutch",
    },
    landing: {
        header: {
            title: "SURF Access",
            subTitle: "Enabling users in secondary vocational-, higher education and research <strong>to access multiple services with one account</strong>.",
            login: "Come on in",
            sup: "EduID ServiceDesk is by invitation only.",
        },
        tabs: {
            home: "Home",
            connect: "How to connect",
            institutions: "All institutions",
            applications: "All applications",

        },
        applicationProviders: {
            title: "For application providers",
            info: [
                "Has an educational or research institution asked you to join SURF Access?",
                "SURF Access centrally manages authentication, authorization, group management, and privacy/security agreements.",
                "Connecting to our SURF Access is free and you wil start in a sandbox."
            ],
            connect: "How to connect"
        },
        institutions: {
            title: "For institutions",
            info: [
                "Do you want your students, staff and researchers to easily access multiple cloud services?",
                "SURF Access offers 'Single Sign On'-access to a large and increasing number of them.",
                "It simplifies your work with a single integration instead of separate connections for each service."
            ],
            contact: "Contact us",
            contactMail: "mailto:info@surfconext.nl"
        },
        joining: {
            title: "Joining many to many",
            info: [
                "SURF Access securily connects 1M+ users to over 3000 (web)applications. SURF Access is a service from <a target='_blank' href='https://surfnet.nl'>SURF</a>.",
                "Interested which institutions and applications are connected?"
            ],
            links: {
                prefix: "Browse ",
                institutions: "all {{nbr}} institutions",
                or: " or ",
                applications: "all {{nbr}} applications.",
            }
        }
    },
    navigation: {
        home: "Home",
        applications: "Applications",
        teams: "Teams"
    },
    breadCrumb: {
        access: "SURF Access",
        applications: "Application maintenance"
    },
    organizations: {
        tooltip: "SURF beoordeelt je organisastie registratie. Je kunt apps registreren op onze testomgeving, voor toegang naar productie moet je ‘bevestigd’ zijn."
    },
    application: {
        new: "New Application",
        edit: "Edit {{name}}",
        name: "Name",
        nameInfo: "Gebruik een naam die herkenbaar zal zijn voor instellingen",
        type: "Type",
        app: "Een Applicatie (tools, clouddiensten, utitilities etc...)",
        content: "Content dienst (streaming media, educatieve content, e-books)",
        contentInfoPre: "Content diensten ontvangen de ",
        contentInfoLink: "minimale set",
        contentInfoPost: " aan attributen.",
        contentInfoTip: "Attributenset voor content providers:<ul><li>Persistent or Transient NameID</li><li>schacHomeOrganization</li>" +
            "<li>eduPersonAffiliation</li><li>eduPersonScopedAffiliation</li></ul>",
        targetGroup: "Target group",
        targetSURF: "Verschillende gebruikers die beheerd worden in een (onderzoeks)groep",
        targetSURFInfo: "De gebruikers worden individueel uitgenodigd bij de groep.",
        targetSRAM: "Studenten, medewerkers en externen uit één instellings IdP",
        targetSRAMInfo: "Zij krijgen toegang omdat ze een kenmerk of rol hebben.",
        terms: "Fair Use terms",
        checks: {
            personal: "Mijn applicatie slaat persoonsgegevens veilig op",
            duration: "Ik bewaar de persoonsgegevens niet langer dan nodig",
            privacy: "Ik verstrek de persoonsgegevens niet aan derden",
            safe: "Ik houd mijn applicatie veilig en beschikbaar",
            support: "Ik ben bereikbaar bij vragen en problemen"
        },
        checksInfo: {
            personal: "De persoonsgegevens worden op een beveiligde manier opgeslagen.",
            duration: "De persoonsgegevens worden echt niet langer dan nodig opgeslagen",
            privacy: "De persoonsgegevens worden niet aan derden verstrekt",
            safe: "De applicatie is uitermate veilig en bijna altijd beschikbaar",
            support: "Als er vragen of problemen zijn, dan zoek je het maar uit"
        }
    },
    connection: {
        overview: "Overview",
        testing: "Testing",
        prod: "Production",
        application: "App information",
        contract: "Contract",
        welcome: "Welkom {{user}}. {{name}} is nog niet gekoppeld met SURF Access. Begin met een koppeling aan onze testomgeving.",
        testSection: "Test",
        teamSection: "Team",
        test: {
            name: "Test",
            connections: "Koppelingen met onze testomgeving",
            info: "Test of federatief inloggen werkt via onze testomgeving."
        },
        team: {
            name: "Teams",
            info: "Geef teamleden of externen toegang tot deze applicatie space.",
            members: "Teamleden voor beheer van deze applicatie"
        },
        production: {
            name: "Production",
            connections: "Koppelingen met onze productieomgeving",
            catalogue: "App informatie voor de SURF App catalogus",
            access: "Toegang en zichtbaarheid",
            contract: "Contract",
            disclaimer: "Een koppeling aan de productieomgeving van SURF Access heeft goedkeuring nodig van team SURF Access. Alle boventaande informatie is verplicht.",
        }
    },
    forms: {
        cancel: "Cancel",
        submit: "Submit",
        edit: "Edit",
        delete: "Delete"
    },
    footer: {
        terms: "Terms of Use",
        termsLink: "https://support.surfconext.nl/terms-en",
        privacy: "Privacy policy",
        privacyLink: "https://support.surfconext.nl/privacy-en",
        surfLink: "https://surf.nl",
        select_locale: "Select your preferred language"
    },

}

export default en;
