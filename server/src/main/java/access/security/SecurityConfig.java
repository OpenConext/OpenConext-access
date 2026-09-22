package access.security;

import access.repository.UserRepository;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.context.DelegatingSecurityContextRepository;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

@EnableWebSecurity
@EnableScheduling
@Configuration
@EnableMethodSecurity
@EnableCaching
@EnableConfigurationProperties({SuperAdmin.class})
public class SecurityConfig {

    private static final Log LOG = LogFactory.getLog(SecurityConfig.class);

    public static final String API_TOKEN_HEADER = "X-API-TOKEN";

    private final ClientRegistrationRepository clientRegistrationRepository;
    private final Environment environment;
    private final List<String> eduidIdpEntityIdentifiers;
    private final String minimalStepupAcrLevel;
    private final SuperAdmin superAdmin;

    @Autowired
    public SecurityConfig(ClientRegistrationRepository clientRegistrationRepository,
                          Environment environment,
                          SuperAdmin superAdmin,
                          @Value("${eduid-idp-entity-id}") String eduidIdpEntityId,
                          @Value("${config.minimal_stepup_acr_level}") String minimalStepupAcrLevel) {
        this.clientRegistrationRepository = clientRegistrationRepository;
        this.environment = environment;
        this.eduidIdpEntityIdentifiers = Stream.of(eduidIdpEntityId.split(",")).map(entityId -> entityId.trim()).toList();
        this.minimalStepupAcrLevel = minimalStepupAcrLevel;
        this.superAdmin = superAdmin;
    }

    @Configuration
    @EnableConfigurationProperties({SuperAdmin.class})
    public static class MvcConfig implements WebMvcConfigurer {

        private final UserRepository userRepository;
        private final SuperAdmin superAdmin;

        @Autowired
        public MvcConfig(UserRepository userRepository, SuperAdmin superAdmin) {
            this.userRepository = userRepository;
            this.superAdmin = superAdmin;
        }

        @Override
        public void addArgumentResolvers(List<HandlerMethodArgumentResolver> argumentResolvers) {
            argumentResolvers.add(new UserHandlerMethodArgumentResolver(userRepository, superAdmin));
        }

    }

    @Bean
    public CookieSerializer cookieSerializer(@Value("${server.servlet.session.cookie.secure}") boolean secure) {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setUseSecureCookie(secure);
        return serializer;
    }

    @Bean
    @Order(1)
    SecurityFilterChain sessionSecurityFilterChain(HttpSecurity http,
                                                   UserRepository userRepository,
                                                   @Value("${institution-admin.entitlement}") String entitlement,
                                                   @Value("${institution-admin.organization-guid-prefix}") String organizationGuidPrefix) throws Exception {
        http
            .csrf(csrfConfigurer -> csrfConfigurer
                .ignoringRequestMatchers(
                    "/api/v1/test/login",
                    "/login/oauth2/code/oidcng",
                    "/api/v1/validations/**"))
            .securityMatcher("/login/oauth2/**", "/oauth2/authorization/**", "/api/v1/**")
            .authorizeHttpRequests(authorizeHttpRequestsConfigurer -> authorizeHttpRequestsConfigurer
                .requestMatchers(
                    "/api/v1/csrf",
                    "/api/v1/disclaimer",
                    "/api/v1/users/config",
                    "/api/v1/users/logout",
                    "/api/v1/validations/**",
                    "/api/v1/test/login",
                    "/api/v1/public/**",
                    "/api/v1/manage/arp",
                    "/api/v1/stats/loginTimeFrame",
                    "/api/v1/monitoring",
                    "/api/v1/manage/allowed-attributes",
                    "/api/v1/manage/privacy",
                    "/ui/**",
                    "/internal/health",
                    "/internal/info")
                .permitAll()
                .anyRequest()
                .authenticated()
            )
            .oauth2Login(oAuth2LoginConfigurer -> oAuth2LoginConfigurer
                .authorizationEndpoint(authorization -> authorization
                    .authorizationRequestResolver(
                        authorizationRequestResolver(this.clientRegistrationRepository)
                    )
                ).userInfoEndpoint(userInfoEndpointConfigurer -> userInfoEndpointConfigurer.oidcUserService(
                    new CustomOidcUserService(userRepository, superAdmin, entitlement, organizationGuidPrefix)))
            )
            //We need a reference to the securityContextRepository to update the authentication after an InstitutionAdmin accepts an invitation
            .securityContext(securityContextConfigurer ->
                securityContextConfigurer.securityContextRepository(this.securityContextRepository()));
        if (environment.acceptsProfiles(Profiles.of("dev", "local"))) {
            //Thus avoiding an oauth2 login for local development
            http.addFilterBefore(new LocalDevelopmentAuthenticationFilter(), AnonymousAuthenticationFilter.class);
        }
        return http.build();
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new DelegatingSecurityContextRepository(
            new RequestAttributeSecurityContextRepository(),
            new HttpSessionSecurityContextRepository()
        );
    }


    @Bean
    @Order(2)
    SecurityFilterChain basicAuthenticationSecurityFilterChain(HttpSecurity http,
                                                               @Value("${lifecycle.user}") String lifeCycleUser,
                                                               @Value("${lifecycle.password}") String lifeCyclePassword) throws Exception {
        http.csrf(c -> c.disable())
            .securityMatcher(
                "/api/external/v1/deprovision/**",
                "/internal/prometheus"
            ).sessionManagement(c -> c
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            ).authorizeHttpRequests(auth -> auth
                .requestMatchers("/internal/prometheus").hasRole("ACTUATOR")
                .requestMatchers("/api/external/v1/deprovision/**").hasRole("LIFECYCLE"))
            .authorizeHttpRequests(c -> c
                .anyRequest()
                .authenticated()
            )
            .userDetailsService(new InMemoryUserDetailsManager(
                new org.springframework.security.core.userdetails.User(
                    lifeCycleUser,
                    "{noop}".concat(lifeCyclePassword),
                    List.of(new SimpleGrantedAuthority("ROLE_LIFECYCLE"))
                )
            ))
            .httpBasic(Customizer.withDefaults());
        return http.build();
    }

    private OAuth2AuthorizationRequestResolver authorizationRequestResolver(
        ClientRegistrationRepository clientRegistrationRepository) {
        DefaultOAuth2AuthorizationRequestResolver authorizationRequestResolver =
            new DefaultOAuth2AuthorizationRequestResolver(
                clientRegistrationRepository, "/oauth2/authorization");
        authorizationRequestResolver.setAuthorizationRequestCustomizer(
            new AuthorizationRequestCustomizer(eduidIdpEntityIdentifiers, minimalStepupAcrLevel));
        return authorizationRequestResolver;
    }

    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver slr = new AcceptHeaderLocaleResolver();
        slr.setDefaultLocale(Locale.ENGLISH);
        return slr;
    }

}
