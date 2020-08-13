import org.openqa.selenium.Alert;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.devtools.DevTools;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;
import org.testng.annotations.*;
import java.io.File;
import java.sql.SQLOutput;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public class App {

    ChromeDriver driver;

    @BeforeMethod
    public void setup() {
        if(System.getProperty("os.name").startsWith("Windows")){
            System.setProperty("webdriver.chrome.driver", "C:/Users/Osmancan/Documents/GitHub/cs458/Project 1- Windows/spotify-tests/src/main/java/chromedriver.exe");
        }
        driver = new ChromeDriver();
        driver.manage().timeouts().implicitlyWait(15, TimeUnit.SECONDS);
        driver.manage().window().maximize();

        driver.get("file:///" + new File("../mapapp/mapapp.html").getAbsolutePath());
    }

    @Test
    public void shouldShowTheMap() {
        WebElement mapContainer = driver.findElementById("map");
        Assert.assertNotEquals(mapContainer.findElements(By.xpath(".//*")).size(), 0);
    }

    @Test
    public void shouldShowCityWhenCoordinatesAreEntered() throws InterruptedException {
        // Arrange
        WebElement menu_button = driver.findElement(By.id("show-city-menu-button"));
        WebElement lat_input = driver.findElement(By.id("lat-input"));
        WebElement lng_input = driver.findElement(By.id("lng-input"));
        WebElement button = driver.findElement(By.id("ok-button"));
        new WebDriverWait(driver, Duration.ofSeconds(30)).until(ExpectedConditions.elementToBeClickable(menu_button));

        // Act
        menu_button.click();
        lat_input.sendKeys("38.396513");
        Thread.sleep(2000);
        lng_input.sendKeys("26.746728");
        button.click();

        // Assert
        WebElement toastBody = driver.findElement(By.id("toast-body"));
        String expectedCity = "You are in İzmir";
        new WebDriverWait(driver, Duration.ofSeconds(30)).until(ExpectedConditions.textToBePresentInElement(toastBody, expectedCity));
        String actualCity = driver.findElement(By.id("toast-body")).getText();
        Assert.assertEquals(actualCity, expectedCity);
    }

    @Test
    public void shouldGetLocationAutomaticallyAndShowDistanceToNearestCity() {
        // Mock geolocation
        Map coordinates = new HashMap()
        {{
            put("latitude", 38.38);
            put("longitude", 26.92);
            put("accuracy", 1);
        }};

        // Arrange
        WebElement menu_button = driver.findElement(By.id("nearest-city-menu-button"));
        new WebDriverWait(driver, Duration.ofSeconds(30)).until(ExpectedConditions.elementToBeClickable(menu_button));

        // Act
        driver.executeCdpCommand("Emulation.setGeolocationOverride", coordinates);
        menu_button.click();

        // Assert
        WebElement toastBody = driver.findElement(By.id("toast-body"));
        String expectedText = "You are 20.04 km away from İzmir";
        new WebDriverWait(driver, Duration.ofSeconds(30)).until(ExpectedConditions.textToBePresentInElement(toastBody, expectedText));
        String actualText = driver.findElement(By.id("toast-body")).getText();
        Assert.assertEquals(expectedText, actualText);
    }

    @Test
    public void shouldShowNearestCityCenterEvenIfItIsADifferentCityThanTheCoordinatesAreIn() {
        // Mock geolocation
        Map coordinates = new HashMap()
        {{
            put("latitude", 38.61644);
            put("longitude", 27.22116);
            put("accuracy", 1);
        }};

        // Arrange
        WebElement menu_button = driver.findElement(By.id("nearest-city-menu-button"));
        new WebDriverWait(driver, Duration.ofSeconds(30)).until(ExpectedConditions.elementToBeClickable(menu_button));

        // Act
        driver.executeCdpCommand("Emulation.setGeolocationOverride", coordinates);
        menu_button.click();

        // Assert
        WebElement toastBody = driver.findElement(By.id("toast-body"));
        String expectedText = "You are 18.13 km away from Manisa";
        new WebDriverWait(driver, Duration.ofSeconds(30)).until(ExpectedConditions.textToBePresentInElement(toastBody, expectedText));
        String actualText = driver.findElement(By.id("toast-body")).getText();
        Assert.assertEquals(expectedText, actualText);
    }

    @Test
    public void shouldShowDistanceToCenterOfTheEarthWithCurrentLocation() throws InterruptedException {
        // Mock geolocation
        Map coordinates = new HashMap()
        {{
            put("latitude", 38.387712);
            put("longitude", 27.1351808);
            put("accuracy", 1);
        }};

        // Arrange
        WebElement menu_button = driver.findElement(By.id("earth-center-menu-button"));
        WebElement current_location_button =driver.findElement(By.id("current-location-button"));
        new WebDriverWait(driver, Duration.ofSeconds(30)).until(ExpectedConditions.elementToBeClickable(menu_button));

        // Act
        driver.executeCdpCommand("Emulation.setGeolocationOverride", coordinates);
        menu_button.click();
        new WebDriverWait(driver, Duration.ofSeconds(30)).until(ExpectedConditions.elementToBeClickable(current_location_button));
        current_location_button.click();
        Thread.sleep(2000);
        driver.findElement(By.id("ok-button")).click();

        // Assert
        WebElement toastBody = driver.findElement(By.id("toast-body"));
        String expectedText = "You are 6369.987 km away from the earth center";
        new WebDriverWait(driver, Duration.ofSeconds(30)).until(ExpectedConditions.textToBePresentInElement(toastBody, expectedText));
        String actualText = driver.findElement(By.id("toast-body")).getText();
        Assert.assertEquals(expectedText, actualText);
    }

    @Test
    public void shouldShowErrorWhenInvalidCoordinatesAreEntered() throws InterruptedException {
        // Arrange
        WebElement menu_button = driver.findElement(By.id("show-city-menu-button"));
        WebElement lat_input = driver.findElement(By.id("lat-input"));
        WebElement lng_input = driver.findElement(By.id("lng-input"));
        WebElement button = driver.findElement(By.id("ok-button"));
        new WebDriverWait(driver, Duration.ofSeconds(30)).until(ExpectedConditions.elementToBeClickable(menu_button));

        // Act
        menu_button.click();
        lat_input.sendKeys("38AA");
        Thread.sleep(2000);
        lng_input.sendKeys("26.92");
        button.click();

        // Assert
        String actualText = driver.findElementById("error-message").getText();
        String expectedText = "Invalid character in latitude";
        Assert.assertEquals(actualText, expectedText);
    }

    @Test
    public void shouldShowErrorWhenLatitudeIsEmpty(){
        // Arrange
        WebElement menu_button = driver.findElement(By.id("show-city-menu-button"));
        WebElement lat_input = driver.findElement(By.id("lat-input"));
        WebElement lng_input = driver.findElement(By.id("lng-input"));
        WebElement button = driver.findElement(By.id("ok-button"));
        new WebDriverWait(driver, Duration.ofSeconds(30)).until(ExpectedConditions.elementToBeClickable(menu_button));

        // Act
        menu_button.click();
        lat_input.sendKeys("");
        lng_input.sendKeys("26.92");
        button.click();

        // Assert
        String actualText = driver.findElementById("error-message").getText();
        String expectedText = "Latitude cannot be empty";
        Assert.assertEquals(actualText, expectedText);
    }

    @Test
    public void shouldShowErrorWhenLongitudeIsEmpty(){
        // Arrange
        WebElement menu_button = driver.findElement(By.id("show-city-menu-button"));
        WebElement lat_input = driver.findElement(By.id("lat-input"));
        WebElement lng_input = driver.findElement(By.id("lng-input"));
        WebElement button = driver.findElement(By.id("ok-button"));
        new WebDriverWait(driver, Duration.ofSeconds(30)).until(ExpectedConditions.elementToBeClickable(menu_button));

        // Act
        menu_button.click();
        lat_input.sendKeys("38");
        lng_input.sendKeys("");
        button.click();

        // Assert
        String actualText = driver.findElementById("error-message").getText();
        String expectedText = "Longitude cannot be empty";
        Assert.assertEquals(actualText, expectedText);
    }

    @AfterMethod
    public void cleanup() {
        driver.quit();
    }
}
