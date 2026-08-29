package access.api;


import access.exception.BaseException;
import access.exception.IdpConfigurationException;
import access.exception.NotFoundException;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.error.ErrorAttributeOptions;
import org.springframework.boot.webmvc.error.ErrorAttributes;
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.*;

@RestController
@Hidden
public class DefaultErrorController implements ErrorController {

    private static final Log LOG = LogFactory.getLog(DefaultErrorController.class);

    private static final List<Class<?>> suppressStackTraceClasses = List.of(
        NotFoundException.class
    );

    private final ErrorAttributes errorAttributes;

    @Autowired
    public DefaultErrorController(ErrorAttributes errorAttributes) {
        this.errorAttributes = errorAttributes;
    }

    @RequestMapping("/error")
    public ResponseEntity<Map<String, Object>> error(HttpServletRequest request) {
        WebRequest webRequest = new ServletWebRequest(request);
        Throwable error = this.errorAttributes.getError(webRequest);

        //Only exceptions this application deliberately throws for the client (validation, not-found, forbidden,
        //...) may expose their class/message. Anything else (NPEs, JDBC/Hibernate errors, ...) could leak
        //internal implementation detail, so only a generic message is returned - full detail is still logged below.
        boolean clientFacing = error == null || isClientFacingException(error);
        Map<String, Object> result = this.errorAttributes.getErrorAttributes(
            webRequest,
            clientFacing
                ? ErrorAttributeOptions.of(
                    ErrorAttributeOptions.Include.EXCEPTION,
                    ErrorAttributeOptions.Include.STATUS,
                    ErrorAttributeOptions.Include.MESSAGE,
                    ErrorAttributeOptions.Include.BINDING_ERRORS)
                : ErrorAttributeOptions.of(ErrorAttributeOptions.Include.STATUS)
        );
        if (!clientFacing) {
            result.put("message", "An unexpected error occurred");
        }

        HttpStatus statusCode;

        if (error == null) {
            if (result.containsKey("message") && ((String) result.get("message")).equalsIgnoreCase("forbidden")) {
                statusCode = FORBIDDEN;
            } else {
                statusCode = result.containsKey("status") && (int) result.get("status") != 999 ?
                    HttpStatus.valueOf((int) result.get("status")) : INTERNAL_SERVER_ERROR;
            }

        } else {
            boolean suppressStackTrace = suppressStackTraceClasses.stream().anyMatch(clazz -> clazz.equals(error.getClass()));
            LOG.error(String.format("Error occurred: %s", error), suppressStackTrace ? null : error);
            if (error instanceof AccessDeniedException) {
                statusCode = FORBIDDEN;
            } else {
                //https://github.com/spring-projects/spring-boot/issues/3057
                ResponseStatus annotation = AnnotationUtils.getAnnotation(error.getClass(), ResponseStatus.class);
                statusCode = annotation != null ? annotation.value() : BAD_REQUEST;
            }
        }
        result.put("status", statusCode.value());
        if (error instanceof IdpConfigurationException idpConfigurationException) {
            result.put("reference", idpConfigurationException.getReference());
        }
        return ResponseEntity.status(statusCode).body(result);
    }

    private boolean isClientFacingException(Throwable error) {
        return error instanceof BaseException
                || error instanceof AuthenticationException
                || error instanceof ResponseStatusException
                || error instanceof AccessDeniedException;
    }

}
