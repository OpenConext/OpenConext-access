package access;

import java.util.Map;
import java.util.function.UnaryOperator;

public interface UserInfoEnhancer extends UnaryOperator<Map<String, Object>> {

    void enhanceUserInfo(Map<String, Object> userInfo);

    @Override
    default Map<String, Object> apply(Map<String, Object> userInfo) {
        enhanceUserInfo(userInfo);
        return userInfo;
    }
}
